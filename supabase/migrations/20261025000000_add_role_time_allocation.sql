alter table public.ceo_plans
  add column if not exists time_allocation jsonb;

alter table public.weekly_actions
  add column if not exists role_recommendation text not null default 'execute',
  add column if not exists role_reason text not null default 'Clasificación no disponible en el plan anterior.',
  add column if not exists estimated_hours numeric not null default 0.5;

alter table public.weekly_actions
  drop constraint if exists weekly_actions_role_recommendation_check,
  drop constraint if exists weekly_actions_role_reason_check,
  drop constraint if exists weekly_actions_estimated_hours_check,
  drop constraint if exists weekly_actions_role_hours_check;

alter table public.weekly_actions
  add constraint weekly_actions_role_recommendation_check
    check (role_recommendation in ('execute', 'delegate', 'automate', 'defer')),
  add constraint weekly_actions_role_reason_check
    check (char_length(btrim(role_reason)) between 2 and 1000),
  add constraint weekly_actions_estimated_hours_check
    check (estimated_hours >= 0),
  add constraint weekly_actions_role_hours_check
    check (
      (role_recommendation = 'defer' and estimated_hours = 0)
      or
      (role_recommendation <> 'defer' and estimated_hours > 0)
    );

create or replace function public.complete_ceo_plan(
  p_plan_id uuid,
  p_executive_summary text,
  p_diagnosis text,
  p_priorities jsonb,
  p_weekly_plan jsonb,
  p_actions jsonb,
  p_strategic_diagnosis jsonb,
  p_time_allocation jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  owner_hours numeric;
  available_hours numeric;
  allocated_hours numeric;
  reserved_hours numeric;
begin
  if jsonb_typeof(p_time_allocation) is distinct from 'object'
    or btrim(coalesce(p_time_allocation->>'rationale', '')) = ''
    or p_time_allocation->>'available_hours' is null
    or p_time_allocation->>'allocated_hours' is null
    or p_time_allocation->>'reserved_hours' is null
    or (p_time_allocation->>'available_hours')::numeric < 0
    or (p_time_allocation->>'allocated_hours')::numeric < 0
    or (p_time_allocation->>'reserved_hours')::numeric < 0
  then
    raise exception using
      errcode = '22023',
      message = 'CEO time allocation contains invalid values';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_actions) as item(
      sequence integer,
      action text,
      objective text,
      reason text,
      success_metric text,
      expected_result text,
      role_recommendation text,
      role_reason text,
      estimated_hours numeric,
      execution_mode text,
      action_type text
    )
    where item.role_recommendation not in ('execute', 'delegate', 'automate', 'defer')
      or btrim(coalesce(item.role_reason, '')) = ''
      or item.estimated_hours is null
      or item.estimated_hours < 0
      or (item.role_recommendation = 'defer' and item.estimated_hours <> 0)
      or (item.role_recommendation <> 'defer' and item.estimated_hours <= 0)
  )
  then
    raise exception using
      errcode = '22023',
      message = 'CEO actions contain invalid role or time values';
  end if;

  select bd.owner_hours_per_week::numeric
  into owner_hours
  from public.ceo_plans cp
  join public.business_diagnostics bd
    on bd.business_id = cp.business_id
  where cp.id = p_plan_id;

  select coalesce(sum(item.estimated_hours), 0::numeric)
  into allocated_hours
  from jsonb_to_recordset(p_actions) as item(
    estimated_hours numeric
  );

  available_hours := (p_time_allocation->>'available_hours')::numeric;
  reserved_hours := (p_time_allocation->>'reserved_hours')::numeric;

  if owner_hours is null
    or available_hours <> owner_hours
    or (p_time_allocation->>'allocated_hours')::numeric <> allocated_hours
    or reserved_hours <> available_hours - allocated_hours
    or allocated_hours > owner_hours
  then
    raise exception using
      errcode = '22023',
      message = 'CEO time allocation is inconsistent with actions or capacity';
  end if;

  if exists (
    with plan_items as (
      select * from jsonb_to_recordset(p_weekly_plan) as item(
        sequence integer,
        action text,
        objective text,
        reason text,
        success_metric text,
        expected_result text,
        role_recommendation text,
        role_reason text,
        estimated_hours numeric,
        execution_mode text,
        action_type text
      )
    ), action_items as (
      select * from jsonb_to_recordset(p_actions) as item(
        sequence integer,
        action text,
        objective text,
        reason text,
        success_metric text,
        expected_result text,
        role_recommendation text,
        role_reason text,
        estimated_hours numeric,
        execution_mode text,
        action_type text
      )
    )
    select 1
    from plan_items full join action_items using (sequence)
    where plan_items.sequence is distinct from action_items.sequence
      or plan_items.role_recommendation is distinct from action_items.role_recommendation
      or plan_items.role_reason is distinct from action_items.role_reason
      or plan_items.estimated_hours is distinct from action_items.estimated_hours
  )
  then
    raise exception using
      errcode = '22023',
      message = 'CEO_PLAN_ROLE_PAYLOAD_MISMATCH';
  end if;

  perform public.complete_ceo_plan(
    p_plan_id,
    p_executive_summary,
    p_diagnosis,
    p_priorities,
    p_weekly_plan,
    p_actions,
    p_strategic_diagnosis
  );

  update public.weekly_actions as wa
  set role_recommendation = item.role_recommendation,
      role_reason = item.role_reason,
      estimated_hours = item.estimated_hours
  from jsonb_to_recordset(p_actions) as item(
    sequence integer,
    role_recommendation text,
    role_reason text,
    estimated_hours numeric
  )
  where wa.ceo_plan_id = p_plan_id
    and wa.sequence = item.sequence;

  update public.ceo_plans
  set time_allocation = p_time_allocation
  where id = p_plan_id
    and status = 'ready';

  return p_plan_id;
end;
$$;

revoke all on function public.complete_ceo_plan(uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function public.complete_ceo_plan(uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb) from anon;
grant execute on function public.complete_ceo_plan(uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;
