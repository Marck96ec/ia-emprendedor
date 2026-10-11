/*
 * Complete a CEO plan and its seven actions in one transaction.
 * The functions validate ownership because they run with definer rights.
 */
create or replace function public.complete_ceo_plan(
  p_plan_id uuid,
  p_executive_summary text,
  p_diagnosis text,
  p_priorities jsonb,
  p_weekly_plan jsonb,
  p_actions jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := (select auth.uid());
  plan_owner_id uuid;
  plan_status text;
begin
  if current_user_id is null
  then
    raise exception using
      errcode = '42501',
      message = 'Authenticated user required';
  end if;

  select b.owner_id, cp.status
  into plan_owner_id, plan_status
  from public.ceo_plans cp
  join public.businesses b on b.id = cp.business_id
  where cp.id = p_plan_id
  for update of cp, b;

  if plan_owner_id is distinct from current_user_id then
    raise exception using
      errcode = '42501',
      message = 'CEO plan does not belong to the current user';
  end if;

  if plan_status is distinct from 'generating' then
    raise exception using
      errcode = 'P0001',
      message = 'CEO plan is not generating';
  end if;

  if exists (
    select 1
    from public.weekly_actions wa
    join public.action_results ar
      on ar.weekly_action_id = wa.id
    where wa.ceo_plan_id = p_plan_id
      and ar.status = 'approved'
  )
  then
    raise exception using
      errcode = 'P0001',
      message = 'CEO plan contains an approved action';
  end if;

  if btrim(coalesce(p_executive_summary, '')) = ''
    or btrim(coalesce(p_diagnosis, '')) = ''
  then
    raise exception using
      errcode = '22023',
      message = 'CEO plan summary and diagnosis are required';
  end if;

  if jsonb_typeof(p_priorities) is distinct from 'array' then
    raise exception using
      errcode = '22023',
      message = 'CEO plan priorities must be an array';
  end if;

  if jsonb_array_length(p_priorities) <> 3 then
    raise exception using
      errcode = '22023',
      message = 'CEO plan must contain exactly three priorities';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_priorities) as priority(
      rank integer,
      title text,
      reason text,
      expected_impact text
    )
    where priority.rank is null
      or priority.rank not between 1 and 3
      or btrim(coalesce(priority.title, '')) = ''
      or btrim(coalesce(priority.reason, '')) = ''
      or btrim(coalesce(priority.expected_impact, '')) = ''
  )
  then
    raise exception using
      errcode = '22023',
      message = 'CEO plan contains an invalid priority';
  end if;

  if (
    select count(distinct priority.rank)
    from jsonb_to_recordset(p_priorities) as priority(
      rank integer,
      title text,
      reason text,
      expected_impact text
    )
  ) <> 3
  then
    raise exception using
      errcode = '22023',
      message = 'CEO plan priorities must use unique ranks';
  end if;

  if jsonb_typeof(p_weekly_plan) is distinct from 'array' then
    raise exception using
      errcode = '22023',
      message = 'CEO weekly plan must be an array';
  end if;

  if jsonb_array_length(p_weekly_plan) <> 7 then
    raise exception using
      errcode = '22023',
      message = 'CEO weekly plan must contain exactly seven actions';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_weekly_plan) as item(
      day integer,
      action text,
      objective text,
      success_metric text,
      execution_mode text,
      action_type text
    )
    where item.day is null
      or item.day not between 1 and 7
      or btrim(coalesce(item.action, '')) = ''
      or btrim(coalesce(item.objective, '')) = ''
      or btrim(coalesce(item.success_metric, '')) = ''
      or item.execution_mode not in ('manual', 'ai_assisted')
      or item.action_type not in (
        'generic',
        'value_proposition',
        'commercial_messages'
      )
      or (
        item.execution_mode = 'manual'
        and item.action_type <> 'generic'
      )
      or (
        item.execution_mode = 'ai_assisted'
        and item.action_type = 'generic'
      )
  )
  then
    raise exception using
      errcode = '22023',
      message = 'CEO weekly plan contains an invalid action';
  end if;

  if (
    select count(distinct item.day)
    from jsonb_to_recordset(p_weekly_plan) as item(
      day integer,
      action text,
      objective text,
      success_metric text,
      execution_mode text,
      action_type text
    )
  ) <> 7
  then
    raise exception using
      errcode = '22023',
      message = 'CEO weekly plan days must be unique';
  end if;

  if jsonb_typeof(p_actions) is distinct from 'array' then
    raise exception using
      errcode = '22023',
      message = 'CEO actions must be an array';
  end if;

  if jsonb_array_length(p_actions) <> 7 then
    raise exception using
      errcode = '22023',
      message = 'CEO actions must contain exactly seven items';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_actions) as item(
      day integer,
      action text,
      objective text,
      success_metric text,
      execution_mode text,
      action_type text
    )
    where item.day is null
      or item.day not between 1 and 7
      or btrim(coalesce(item.action, '')) = ''
      or btrim(coalesce(item.objective, '')) = ''
      or btrim(coalesce(item.success_metric, '')) = ''
      or item.execution_mode not in ('manual', 'ai_assisted')
      or item.action_type not in (
        'generic',
        'value_proposition',
        'commercial_messages'
      )
      or (
        item.execution_mode = 'manual'
        and item.action_type <> 'generic'
      )
      or (
        item.execution_mode = 'ai_assisted'
        and item.action_type = 'generic'
      )
  )
  then
    raise exception using
      errcode = '22023',
      message = 'CEO actions contain invalid values';
  end if;

  if (
    select count(distinct item.day)
    from jsonb_to_recordset(p_actions) as item(
      day integer,
      action text,
      objective text,
      success_metric text,
      execution_mode text,
      action_type text
    )
  ) <> 7
  then
    raise exception using
      errcode = '22023',
      message = 'CEO action days must be unique';
  end if;

  if (
    select count(*)
    from jsonb_to_recordset(p_actions) as item(
      day integer,
      action text,
      objective text,
      success_metric text,
      execution_mode text,
      action_type text
    )
    where item.execution_mode = 'ai_assisted'
  ) > 1
  then
    raise exception using
      errcode = '22023',
      message = 'CEO plan allows at most one AI-assisted action';
  end if;

  if exists (
    with plan_items as (
      select *
      from jsonb_to_recordset(p_weekly_plan) as item(
        day integer,
        action text,
        objective text,
        success_metric text,
        execution_mode text,
        action_type text
      )
    ), action_items as (
      select *
      from jsonb_to_recordset(p_actions) as item(
        day integer,
        action text,
        objective text,
        success_metric text,
        execution_mode text,
        action_type text
      )
    )
    select 1
    from plan_items plan_item
    full join action_items action_item
      on action_item.day = plan_item.day
    where plan_item.day is distinct from action_item.day
      or plan_item.action is distinct from action_item.action
      or plan_item.objective is distinct from action_item.objective
      or plan_item.success_metric is distinct from action_item.success_metric
      or plan_item.execution_mode is distinct from action_item.execution_mode
      or plan_item.action_type is distinct from action_item.action_type
  )
  then
    raise exception using
      errcode = '22023',
      message = 'CEO_PLAN_PAYLOAD_MISMATCH';
  end if;

  delete from public.weekly_actions
  where ceo_plan_id = p_plan_id;

  insert into public.weekly_actions (
    ceo_plan_id,
    day,
    action,
    objective,
    success_metric,
    execution_mode,
    action_type
  )
  select
    p_plan_id,
    item.day,
    item.action,
    item.objective,
    item.success_metric,
    item.execution_mode,
    item.action_type
  from jsonb_to_recordset(p_actions) as item(
    day integer,
    action text,
    objective text,
    success_metric text,
    execution_mode text,
    action_type text
  );

  update public.ceo_plans
  set status = 'ready',
      executive_summary = p_executive_summary,
      diagnosis = p_diagnosis,
      priorities = p_priorities,
      weekly_plan = p_weekly_plan,
      generated_at = now()
  where id = p_plan_id
    and status = 'generating';

  return p_plan_id;
end;
$$;

create or replace function public.fail_ceo_plan(
  p_plan_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := (select auth.uid());
  plan_owner_id uuid;
  plan_status text;
begin
  if current_user_id is null
  then
    raise exception using
      errcode = '42501',
      message = 'Authenticated user required';
  end if;

  select b.owner_id, cp.status
  into plan_owner_id, plan_status
  from public.ceo_plans cp
  join public.businesses b on b.id = cp.business_id
  where cp.id = p_plan_id
  for update of cp, b;

  if plan_owner_id is distinct from current_user_id then
    raise exception using
      errcode = '42501',
      message = 'CEO plan does not belong to the current user';
  end if;

  if plan_status not in ('generating', 'failed') then
    raise exception using
      errcode = 'P0001',
      message = 'Only generating or failed CEO plans can be failed';
  end if;

  delete from public.weekly_actions wa
  where wa.ceo_plan_id = p_plan_id
    and not exists (
      select 1
      from public.action_results ar
      where ar.weekly_action_id = wa.id
        and ar.status = 'approved'
    );

  update public.ceo_plans
  set status = 'failed'
  where id = p_plan_id
    and status in ('generating', 'failed');
end;
$$;

revoke all on function public.complete_ceo_plan(
  uuid, text, text, jsonb, jsonb, jsonb
) from public;
revoke all on function public.complete_ceo_plan(
  uuid, text, text, jsonb, jsonb, jsonb
) from anon;
grant execute on function public.complete_ceo_plan(
  uuid, text, text, jsonb, jsonb, jsonb
) to authenticated;

revoke all on function public.fail_ceo_plan(uuid) from public;
revoke all on function public.fail_ceo_plan(uuid) from anon;
grant execute on function public.fail_ceo_plan(uuid) to authenticated;