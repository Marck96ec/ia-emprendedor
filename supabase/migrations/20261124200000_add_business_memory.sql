-- Versioned business context. Existing knowledge, action evidence and plans
-- remain authoritative for their own records.
create table public.business_memory (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  memory_key text not null check (memory_key ~ '^[a-z][a-z0-9_.-]{2,79}$'),
  category text not null check (category in ('fact', 'constraint', 'capability', 'asset', 'learning')),
  content jsonb not null check (
    jsonb_typeof(content) = 'object'
    and jsonb_typeof(content->'label') is not distinct from 'string'
    and char_length(btrim(content->>'label')) between 1 and 160
    and octet_length(content::text) <= 8192
  ),
  origin text not null check (origin in ('owner_input', 'weekly_review', 'business_evidence', 'inference')),
  source_id uuid,
  confirmation text not null check (confirmation in ('declared', 'confirmed', 'inferred', 'evidence_backed')),
  state text not null default 'active' check (state in ('active', 'retired')),
  change_kind text not null check (change_kind in ('initial', 'updated', 'contradicted')),
  supersedes_id uuid,
  observed_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  valid_until timestamptz check (valid_until is null or valid_until > observed_at),
  unique (business_id, id),
  foreign key (business_id, supersedes_id) references public.business_memory(business_id, id) on delete cascade,
  check (
    (origin = 'owner_input' and source_id is not null and confirmation in ('declared', 'confirmed'))
    or (origin = 'weekly_review' and source_id is not null and confirmation = 'declared')
    or (origin = 'business_evidence' and source_id is not null and confirmation = 'evidence_backed')
    or (origin = 'inference' and confirmation = 'inferred')
  )
);

create index business_memory_latest_idx
  on public.business_memory(business_id, memory_key, updated_at desc);

alter table public.business_memory enable row level security;
revoke all on public.business_memory from public, anon, authenticated;
grant select on public.business_memory to authenticated;
create policy "Owners read their business memory"
  on public.business_memory for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

create function public.record_business_memory(
  p_business_id uuid, p_memory_key text, p_category text, p_content jsonb,
  p_confirmation text default 'declared', p_state text default 'active',
  p_valid_until timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := auth.uid();
  previous public.business_memory%rowtype;
  new_id uuid;
  recorded_at timestamptz;
  stored_content jsonb;
begin
  if actor is null or not exists (
    select 1 from public.businesses where id = p_business_id and owner_id = actor
  ) then
    raise exception using errcode = '42501', message = 'Business memory requires ownership';
  end if;
  if p_confirmation is null or p_confirmation not in ('declared', 'confirmed')
    or p_memory_key is null or p_memory_key ~ '^weekly_learning\.'
    or jsonb_typeof(p_content) is distinct from 'object'
    or jsonb_typeof(p_content->'label') is distinct from 'string'
    or (p_content ? 'availability' and coalesce(p_content->>'availability', '') not in ('available', 'unavailable', 'unknown'))
    or (p_memory_key in ('social_media','whatsapp','existing_contacts','delegate')
      and coalesce(p_content->>'availability','') not in ('available','unavailable','unknown'))
  then
    raise exception using errcode = '22023', message = 'Business memory content is invalid';
  end if;

  stored_content := p_content || jsonb_build_object(
    'label', btrim(p_content->>'label'), 'detail', nullif(btrim(p_content->>'detail'), '')
  );
  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text || ':' || p_memory_key, 0));
  select * into previous from public.business_memory
    where business_id = p_business_id and memory_key = p_memory_key
    order by updated_at desc, id desc limit 1;

  if previous.id is not null and previous.category = p_category and previous.content = stored_content
    and previous.confirmation = p_confirmation and previous.state = p_state
    and previous.valid_until is not distinct from p_valid_until
  then
    return previous.id;
  end if;

  recorded_at := clock_timestamp();
  insert into public.business_memory (
    business_id, memory_key, category, content, origin, source_id,
    confirmation, state, change_kind, supersedes_id, observed_at, updated_at, valid_until
  ) values (
    p_business_id, p_memory_key, p_category, stored_content, 'owner_input', actor,
    p_confirmation, p_state,
    case when previous.id is null then 'initial'
      when previous.content->>'availability' in ('available', 'unavailable')
        and stored_content->>'availability' in ('available', 'unavailable')
        and previous.content->>'availability' <> stored_content->>'availability' then 'contradicted'
      else 'updated' end,
    previous.id, recorded_at, recorded_at, p_valid_until
  ) returning id into new_id;
  return new_id;
end;
$$;

create function public.business_memory_as_of(p_business_id uuid, p_as_of timestamptz default now())
returns setof public.business_memory
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select latest.*
  from (
    select distinct on (memory_key) m.*
    from public.business_memory m
    where m.business_id = p_business_id
      and m.observed_at <= p_as_of and m.updated_at <= p_as_of
    order by memory_key, updated_at desc, id desc
  ) latest
  where latest.state = 'active' and (latest.valid_until is null or latest.valid_until > p_as_of)
  order by (latest.memory_key in ('social_media','whatsapp','existing_contacts','delegate')) desc,
    (latest.category = 'constraint') desc, latest.updated_at desc;
$$;

-- The weekly review is the immutable source. The memory entry only carries
-- a pointer and the bounded learning used to retrieve the original.
create function public.remember_weekly_learning()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if char_length(btrim(coalesce(new.decision_learning->>'learning',''))) > 0 then
    insert into public.business_memory (
      business_id, memory_key, category, content, origin, source_id, confirmation, change_kind
    )
    select cp.business_id, 'weekly_learning.' || new.id, 'learning',
      jsonb_build_object('label', 'Aprendizaje de semana ' || cp.week_number,
        'detail', left(new.decision_learning->>'learning', 800), 'week', cp.week_number),
      'weekly_review', new.id, 'declared', 'initial'
      from public.ceo_plans cp where cp.id = new.ceo_plan_id;
  end if;
  return new;
end;
$$;

create trigger weekly_reviews_remember_learning
after insert on public.weekly_reviews
for each row execute function public.remember_weekly_learning();

revoke all on function public.record_business_memory(uuid,text,text,jsonb,text,text,timestamptz) from public, anon;
grant execute on function public.record_business_memory(uuid,text,text,jsonb,text,text,timestamptz) to authenticated;
revoke all on function public.business_memory_as_of(uuid,timestamptz) from public, anon;
grant execute on function public.business_memory_as_of(uuid,timestamptz) to authenticated;
revoke all on function public.remember_weekly_learning() from public, anon, authenticated;
