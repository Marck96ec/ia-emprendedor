alter table public.weekly_actions
  add column if not exists capture_schema jsonb,
  add column if not exists completion_data jsonb;

alter table public.weekly_actions
  drop constraint if exists weekly_actions_completion_data_check;

alter table public.weekly_actions
  add constraint weekly_actions_completion_data_check
  check (completion_data is null or jsonb_typeof(completion_data) = 'object');

create or replace function public.complete_weekly_action_with_evidence(
  p_action_id uuid,
  p_completion_data jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := (select auth.uid());
  action_owner_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if jsonb_typeof(p_completion_data) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'Completion data must be an object';
  end if;

  select b.owner_id
    into action_owner_id
  from public.weekly_actions wa
  join public.ceo_plans cp on cp.id = wa.ceo_plan_id
  join public.businesses b on b.id = cp.business_id
  where wa.id = p_action_id
  for update;

  if action_owner_id is distinct from current_user_id then
    raise exception using errcode = '42501', message = 'Action does not belong to the current user';
  end if;

  update public.weekly_actions
  set status = 'completed',
      completion_data = p_completion_data,
      completed_at = clock_timestamp()
  where id = p_action_id
    and status = 'pending'
    and not exists (
      select 1 from public.weekly_reviews wr
      where wr.ceo_plan_id = weekly_actions.ceo_plan_id
    );

  if not found then
    raise exception using errcode = 'P0001', message = 'Weekly action is not pending or the plan is closed';
  end if;

  return p_action_id;
end;
$$;

revoke all on function public.complete_weekly_action_with_evidence(uuid, jsonb) from public, anon, service_role;
grant execute on function public.complete_weekly_action_with_evidence(uuid, jsonb) to authenticated;

create or replace function public.complete_ceo_plan(
  p_plan_id uuid,
  p_executive_summary text,
  p_diagnosis text,
  p_priorities jsonb,
  p_weekly_plan jsonb,
  p_actions jsonb,
  p_strategic_diagnosis jsonb,
  p_time_allocation jsonb,
  p_decision_hypothesis jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if jsonb_typeof(p_decision_hypothesis) is distinct from 'object'
    or btrim(coalesce(p_decision_hypothesis->>'statement', '')) = ''
    or btrim(coalesce(p_decision_hypothesis->>'validation_signal', '')) = ''
  then
    raise exception using errcode = '22023', message = 'CEO decision hypothesis is required';
  end if;

  perform public.complete_ceo_plan(
    p_plan_id, p_executive_summary, p_diagnosis, p_priorities,
    p_weekly_plan, p_actions, p_strategic_diagnosis, p_time_allocation
  );

  update public.weekly_actions as wa
  set capture_schema = item.capture_schema
  from jsonb_to_recordset(p_actions) as item(
    sequence integer,
    capture_schema jsonb
  )
  where wa.ceo_plan_id = p_plan_id
    and wa.sequence = item.sequence
    and jsonb_typeof(item.capture_schema) = 'object';

  update public.ceo_plans
  set decision_hypothesis = p_decision_hypothesis
  where id = p_plan_id and status = 'ready';

  return p_plan_id;
end;
$$;

create or replace function public.keep_ai_action_pending_without_evidence()
returns trigger
language plpgsql
as $$
begin
  if new.execution_mode = 'ai_assisted'
    and new.status = 'completed'
    and new.completion_data is null
  then
    new.status := 'pending';
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists weekly_actions_require_evidence_for_ai_completion
on public.weekly_actions;

create trigger weekly_actions_require_evidence_for_ai_completion
before update on public.weekly_actions
for each row
execute function public.keep_ai_action_pending_without_evidence();
