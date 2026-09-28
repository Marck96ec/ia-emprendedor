/*
 * IAE-F005: canonical, user-approved business knowledge.
 */

create table public.business_knowledge (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  knowledge_type text not null check (knowledge_type in ('value_proposition')),
  content jsonb not null,
  source_action_result_id uuid not null references public.action_results(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_knowledge_business_type_unique unique (business_id, knowledge_type)
);

create trigger business_knowledge_set_updated_at
before update on public.business_knowledge
for each row execute function public.set_updated_at();

grant select on table public.business_knowledge to authenticated;
revoke all on table public.business_knowledge from anon, public;

alter table public.business_knowledge enable row level security;

create policy "Users can view their own business knowledge"
on public.business_knowledge
for select to authenticated
using (
  business_id in (
    select b.id from public.businesses b
    where b.owner_id = (select auth.uid())
  )
);

insert into public.business_knowledge (
  business_id, knowledge_type, content, source_action_result_id, created_at, updated_at
)
select distinct on (b.id)
  b.id,
  'value_proposition',
  ar.approved_content,
  ar.id,
  coalesce(ar.approved_at, ar.updated_at),
  coalesce(ar.approved_at, ar.updated_at)
from public.action_results ar
join public.weekly_actions wa on wa.id = ar.weekly_action_id
join public.ceo_plans cp on cp.id = wa.ceo_plan_id
join public.businesses b on b.id = cp.business_id
where ar.status = 'approved'
  and wa.action_type = 'value_proposition'
order by b.id, ar.approved_at desc, ar.id desc;

create or replace function public.approve_action_result(p_action_result_id uuid)
returns table (id uuid, weekly_action_id uuid, status text, approved_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid;
  result_row public.action_results%rowtype;
  action_row public.weekly_actions%rowtype;
  action_owner_id uuid;
  action_business_id uuid;
  has_review boolean;
  approval_time timestamptz;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select * into result_row from public.action_results
  where action_results.id = p_action_result_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Action result not found';
  end if;

  select * into action_row from public.weekly_actions
  where weekly_actions.id = result_row.weekly_action_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Weekly action not found';
  end if;

  select b.owner_id, b.id into action_owner_id, action_business_id
  from public.ceo_plans cp
  join public.businesses b on b.id = cp.business_id
  where cp.id = action_row.ceo_plan_id;
  if action_owner_id is distinct from current_user_id then
    raise exception using errcode = '42501', message = 'Action result does not belong to the current user';
  end if;

  if result_row.status = 'approved' and action_row.status = 'completed' then
    return query select result_row.id, result_row.weekly_action_id, result_row.status, result_row.approved_at;
    return;
  end if;
  if result_row.status <> 'draft' then
    raise exception using errcode = 'P0001', message = 'Action result is not a draft';
  end if;
  if action_row.execution_mode <> 'ai_assisted' then
    raise exception using errcode = 'P0001', message = 'Only AI-assisted actions can be approved';
  end if;
  if action_row.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'Weekly action is not pending';
  end if;

  select exists (
    select 1 from public.weekly_reviews wr where wr.ceo_plan_id = action_row.ceo_plan_id
  ) into has_review;
  if has_review then
    raise exception using errcode = 'P0001', message = 'The weekly plan is already closed';
  end if;

  approval_time := clock_timestamp();
  update public.action_results set
    status = 'approved', approved_content = result_row.draft_content,
    draft_content = null, approved_at = approval_time, updated_at = approval_time
  where action_results.id = result_row.id and action_results.status = 'draft';

  update public.weekly_actions set status = 'completed', completed_at = approval_time
  where weekly_actions.id = action_row.id and weekly_actions.status = 'pending';

  if action_row.action_type = 'value_proposition' then
    insert into public.business_knowledge (
      business_id, knowledge_type, content, source_action_result_id, updated_at
    ) values (
      action_business_id, 'value_proposition', result_row.draft_content, result_row.id, approval_time
    ) on conflict (business_id, knowledge_type) do update set
      content = excluded.content,
      source_action_result_id = excluded.source_action_result_id,
      updated_at = excluded.updated_at;
  end if;

  return query select result_row.id, result_row.weekly_action_id, 'approved'::text, approval_time;
end;
$$;

revoke all on function public.approve_action_result(uuid) from public, anon, service_role;
grant execute on function public.approve_action_result(uuid) to authenticated;