alter table public.weekly_actions
  rename column day to sequence;

alter table public.weekly_actions
  drop constraint if exists weekly_actions_one_action_per_day,
  drop constraint if exists weekly_actions_day_check;

alter table public.weekly_actions
  add constraint weekly_actions_sequence_check
    check (sequence > 0),
  add constraint weekly_actions_one_action_per_sequence
    unique (ceo_plan_id, sequence),
  add column reason text not null default 'Motivo no disponible.',
  add column expected_result text not null default 'Resultado esperado no disponible.';

alter table public.weekly_actions
  drop constraint if exists weekly_actions_reason_check,
  drop constraint if exists weekly_actions_expected_result_check;

alter table public.weekly_actions
  add constraint weekly_actions_reason_check
    check (char_length(reason) between 2 and 1000),
  add constraint weekly_actions_expected_result_check
    check (char_length(expected_result) between 2 and 1000);

drop function public.complete_ceo_plan(
  uuid, text, text, jsonb, jsonb, jsonb, jsonb
);
drop function public.complete_ceo_plan(
  uuid, text, text, jsonb, jsonb, jsonb
);

create or replace function public.complete_ceo_plan(
  p_plan_id uuid,
  p_executive_summary text,
  p_diagnosis text,
  p_priorities jsonb,
  p_weekly_plan jsonb,
  p_actions jsonb,
  p_strategic_diagnosis jsonb
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
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authenticated user required';
  end if;

  select b.owner_id, cp.status
  into plan_owner_id, plan_status
  from public.ceo_plans cp
  join public.businesses b on b.id = cp.business_id
  where cp.id = p_plan_id
  for update of cp, b;

  if plan_owner_id is distinct from current_user_id then
    raise exception using errcode = '42501', message = 'CEO plan does not belong to the current user';
  end if;

  if plan_status is distinct from 'generating' then
    raise exception using errcode = 'P0001', message = 'CEO plan is not generating';
  end if;

  if exists (
    select 1
    from public.weekly_actions wa
    join public.action_results ar on ar.weekly_action_id = wa.id
    where wa.ceo_plan_id = p_plan_id and ar.status = 'approved'
  ) then
    raise exception using errcode = 'P0001', message = 'CEO plan contains an approved action';
  end if;

  if btrim(coalesce(p_executive_summary, '')) = ''
    or btrim(coalesce(p_diagnosis, '')) = '' then
    raise exception using errcode = '22023', message = 'CEO plan summary and diagnosis are required';
  end if;

  if jsonb_typeof(p_priorities) is distinct from 'array'
    or jsonb_array_length(p_priorities) <> 3 then
    raise exception using errcode = '22023', message = 'CEO plan must contain exactly three priorities';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_priorities) as priority(rank integer, title text, reason text, expected_impact text)
    where priority.rank is null or priority.rank not between 1 and 3
      or btrim(coalesce(priority.title, '')) = ''
      or btrim(coalesce(priority.reason, '')) = ''
      or btrim(coalesce(priority.expected_impact, '')) = ''
  ) then
    raise exception using errcode = '22023', message = 'CEO plan contains an invalid priority';
  end if;

  if (select count(distinct priority.rank)
      from jsonb_to_recordset(p_priorities) as priority(rank integer, title text, reason text, expected_impact text)) <> 3 then
    raise exception using errcode = '22023', message = 'CEO plan priorities must use unique ranks';
  end if;

  if jsonb_typeof(p_weekly_plan) is distinct from 'array'
    or jsonb_array_length(p_weekly_plan) not between 1 and 5 then
    raise exception using errcode = '22023', message = 'CEO weekly plan must contain between one and five actions';
  end if;

  if jsonb_typeof(p_actions) is distinct from 'array'
    or jsonb_array_length(p_actions) not between 1 and 5 then
    raise exception using errcode = '22023', message = 'CEO actions must contain between one and five items';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_actions) as item(
      sequence integer, action text, objective text, reason text,
      success_metric text, expected_result text, execution_mode text, action_type text
    )
    where item.sequence is null or item.sequence <= 0
      or btrim(coalesce(item.action, '')) = ''
      or btrim(coalesce(item.objective, '')) = ''
      or btrim(coalesce(item.reason, '')) = ''
      or btrim(coalesce(item.success_metric, '')) = ''
      or btrim(coalesce(item.expected_result, '')) = ''
      or item.execution_mode not in ('manual', 'ai_assisted')
      or item.action_type not in ('generic', 'value_proposition', 'commercial_messages')
      or (item.execution_mode = 'manual' and item.action_type <> 'generic')
      or (item.execution_mode = 'ai_assisted' and item.action_type = 'generic')
  ) then
    raise exception using errcode = '22023', message = 'CEO actions contain invalid values';
  end if;

  if (select count(distinct item.sequence)
      from jsonb_to_recordset(p_actions) as item(
        sequence integer, action text, objective text, reason text,
        success_metric text, expected_result text, execution_mode text, action_type text
      )) <> jsonb_array_length(p_actions)
    or (select min(item.sequence)
        from jsonb_to_recordset(p_actions) as item(
          sequence integer, action text, objective text, reason text,
          success_metric text, expected_result text, execution_mode text, action_type text
        )) <> 1
    or (select max(item.sequence)
        from jsonb_to_recordset(p_actions) as item(
          sequence integer, action text, objective text, reason text,
          success_metric text, expected_result text, execution_mode text, action_type text
        )) <> jsonb_array_length(p_actions) then
    raise exception using errcode = '22023', message = 'CEO action sequences must be unique and consecutive from one';
  end if;

  if (select count(*)
      from jsonb_to_recordset(p_actions) as item(
        sequence integer, action text, objective text, reason text,
        success_metric text, expected_result text, execution_mode text, action_type text
      ) where item.execution_mode = 'ai_assisted') > 1 then
    raise exception using errcode = '22023', message = 'CEO plan allows at most one AI-assisted action';
  end if;

  if exists (
    with plan_items as (
      select * from jsonb_to_recordset(p_weekly_plan) as item(
        sequence integer, action text, objective text, reason text,
        success_metric text, expected_result text, execution_mode text, action_type text
      )
    ), action_items as (
      select * from jsonb_to_recordset(p_actions) as item(
        sequence integer, action text, objective text, reason text,
        success_metric text, expected_result text, execution_mode text, action_type text
      )
    )
    select 1
    from plan_items full join action_items using (sequence)
    where plan_items.sequence is distinct from action_items.sequence
      or plan_items.action is distinct from action_items.action
      or plan_items.objective is distinct from action_items.objective
      or plan_items.reason is distinct from action_items.reason
      or plan_items.success_metric is distinct from action_items.success_metric
      or plan_items.expected_result is distinct from action_items.expected_result
      or plan_items.execution_mode is distinct from action_items.execution_mode
      or plan_items.action_type is distinct from action_items.action_type
  ) then
    raise exception using errcode = '22023', message = 'CEO_PLAN_PAYLOAD_MISMATCH';
  end if;

  delete from public.weekly_actions where ceo_plan_id = p_plan_id;

  insert into public.weekly_actions (
    ceo_plan_id, sequence, action, objective, reason, success_metric,
    expected_result, execution_mode, action_type
  )
  select p_plan_id, item.sequence, item.action, item.objective, item.reason,
    item.success_metric, item.expected_result, item.execution_mode, item.action_type
  from jsonb_to_recordset(p_actions) as item(
    sequence integer, action text, objective text, reason text,
    success_metric text, expected_result text, execution_mode text, action_type text
  );

  update public.ceo_plans
  set status = 'ready', executive_summary = p_executive_summary,
      diagnosis = p_diagnosis, strategic_diagnosis = p_strategic_diagnosis,
      priorities = p_priorities, weekly_plan = p_weekly_plan, generated_at = now()
  where id = p_plan_id and status = 'generating';

  return p_plan_id;
end;
$$;

revoke all on function public.complete_ceo_plan(uuid, text, text, jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function public.complete_ceo_plan(uuid, text, text, jsonb, jsonb, jsonb, jsonb) from anon;
grant execute on function public.complete_ceo_plan(uuid, text, text, jsonb, jsonb, jsonb, jsonb) to authenticated;

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
begin
  return public.complete_ceo_plan(
    p_plan_id, p_executive_summary, p_diagnosis, p_priorities,
    p_weekly_plan, p_actions, null
  );
end;
$$;

revoke all on function public.complete_ceo_plan(uuid, text, text, jsonb, jsonb, jsonb) from public;
revoke all on function public.complete_ceo_plan(uuid, text, text, jsonb, jsonb, jsonb) from anon;
grant execute on function public.complete_ceo_plan(uuid, text, text, jsonb, jsonb, jsonb) to authenticated;
