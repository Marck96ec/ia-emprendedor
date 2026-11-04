/*
 * Revisión retomable y evidencia operativa append-only.
 *
 * Los borradores no representan el cierre de una semana. La revisión final
 * continúa siendo inmutable y se crea únicamente después de la confirmación.
 * business_evidence conserva la fuente de cada dato para reutilizarlo sin
 * sobrescribir evidencia histórica.
 */

create table public.weekly_review_drafts (
  id uuid primary key default gen_random_uuid(),
  ceo_plan_id uuid not null unique references public.ceo_plans(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb
    check (jsonb_typeof(answers) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger weekly_review_drafts_set_updated_at
before update on public.weekly_review_drafts
for each row
execute function public.set_updated_at();

grant select, insert, update, delete on public.weekly_review_drafts to authenticated;
revoke all on public.weekly_review_drafts from anon;

alter table public.weekly_review_drafts enable row level security;

create policy "Users can view their own weekly review drafts"
on public.weekly_review_drafts
for select to authenticated
using (
  ceo_plan_id in (
    select cp.id
    from public.ceo_plans cp
    join public.businesses b on b.id = cp.business_id
    where b.owner_id = (select auth.uid())
  )
);

create policy "Users can create their own weekly review drafts"
on public.weekly_review_drafts
for insert to authenticated
with check (
  ceo_plan_id in (
    select cp.id
    from public.ceo_plans cp
    join public.businesses b on b.id = cp.business_id
    where b.owner_id = (select auth.uid())
  )
);

create policy "Users can update their own weekly review drafts"
on public.weekly_review_drafts
for update to authenticated
using (
  ceo_plan_id in (
    select cp.id
    from public.ceo_plans cp
    join public.businesses b on b.id = cp.business_id
    where b.owner_id = (select auth.uid())
  )
)
with check (
  ceo_plan_id in (
    select cp.id
    from public.ceo_plans cp
    join public.businesses b on b.id = cp.business_id
    where b.owner_id = (select auth.uid())
  )
);

create policy "Users can delete their own weekly review drafts"
on public.weekly_review_drafts
for delete to authenticated
using (
  ceo_plan_id in (
    select cp.id
    from public.ceo_plans cp
    join public.businesses b on b.id = cp.business_id
    where b.owner_id = (select auth.uid())
  )
);

create table public.business_evidence (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  evidence_type text not null check (
    evidence_type in (
      'action_result', 'product', 'price', 'cost',
      'opportunity', 'follow_up', 'sale', 'metric'
    )
  ),
  canonical_key text not null check (char_length(canonical_key) between 1 and 200),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  source_weekly_action_id uuid not null references public.weekly_actions(id) on delete restrict,
  source_action_result_id uuid references public.action_results(id) on delete restrict,
  certainty text not null default 'real' check (certainty in ('real', 'estimated', 'unknown')),
  observed_at timestamptz not null default now(),
  period_start date,
  period_end date,
  created_at timestamptz not null default now(),
  constraint business_evidence_period_check check (
    period_end is null or period_start is null or period_start <= period_end
  ),
  constraint business_evidence_source_key_unique unique (source_weekly_action_id, canonical_key)
);

create index business_evidence_business_type_observed_idx
on public.business_evidence (business_id, evidence_type, observed_at desc);

grant select, insert on public.business_evidence to authenticated;
revoke all on public.business_evidence from anon;

alter table public.business_evidence enable row level security;

create policy "Users can view their own business evidence"
on public.business_evidence
for select to authenticated
using (
  business_id in (
    select b.id
    from public.businesses b
    where b.owner_id = (select auth.uid())
  )
);

create policy "Users can create their own business evidence"
on public.business_evidence
for insert to authenticated
with check (
  business_id in (
    select b.id
    from public.businesses b
    where b.owner_id = (select auth.uid())
  )
  and source_weekly_action_id in (
    select wa.id
    from public.weekly_actions wa
    join public.ceo_plans cp on cp.id = wa.ceo_plan_id
    where cp.business_id = business_evidence.business_id
  )
);

create table public.business_evidence_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_evidence_id uuid not null references public.business_evidence(id) on delete restrict,
  target_evidence_id uuid not null references public.business_evidence(id) on delete restrict,
  relation_type text not null check (relation_type in ('follow_up_for', 'updates', 'supports')),
  created_at timestamptz not null default now(),
  constraint business_evidence_links_not_self check (source_evidence_id <> target_evidence_id),
  constraint business_evidence_links_unique unique (
    source_evidence_id, target_evidence_id, relation_type
  )
);

grant select, insert on public.business_evidence_links to authenticated;
revoke all on public.business_evidence_links from anon;

alter table public.business_evidence_links enable row level security;

create policy "Users can view their own evidence links"
on public.business_evidence_links
for select to authenticated
using (
  business_id in (
    select b.id
    from public.businesses b
    where b.owner_id = (select auth.uid())
  )
);

create policy "Users can create their own evidence links"
on public.business_evidence_links
for insert to authenticated
with check (
  business_id in (
    select b.id
    from public.businesses b
    where b.owner_id = (select auth.uid())
  )
  and source_evidence_id in (
    select be.id
    from public.business_evidence be
    where be.business_id = business_evidence_links.business_id
  )
  and target_evidence_id in (
    select be.id
    from public.business_evidence be
    where be.business_id = business_evidence_links.business_id
  )
);
