alter table public.ceo_plans
  add column if not exists external_evidence jsonb,
  add column if not exists evidence_status text not null default 'pending';

alter table public.ceo_plans
  drop constraint if exists ceo_plans_evidence_status_check;

alter table public.ceo_plans
  add constraint ceo_plans_evidence_status_check
  check (evidence_status in ('pending', 'ready', 'insufficient', 'failed'));

update public.ceo_plans
set evidence_status = case
  when status = 'ready' then 'insufficient'
  when status = 'failed' then 'failed'
  else evidence_status
end
where evidence_status = 'pending';