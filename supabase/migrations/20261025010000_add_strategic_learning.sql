alter table public.ceo_plans
  add column if not exists decision_hypothesis jsonb;

alter table public.weekly_reviews
  add column if not exists decision_learning jsonb;

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
    raise exception using
      errcode = '22023',
      message = 'CEO decision hypothesis is required';
  end if;

  perform public.complete_ceo_plan(
    p_plan_id,
    p_executive_summary,
    p_diagnosis,
    p_priorities,
    p_weekly_plan,
    p_actions,
    p_strategic_diagnosis,
    p_time_allocation
  );

  update public.ceo_plans
  set decision_hypothesis = p_decision_hypothesis
  where id = p_plan_id
    and status = 'ready';

  return p_plan_id;
end;
$$;

revoke all on function public.complete_ceo_plan(
  uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) from public;
revoke all on function public.complete_ceo_plan(
  uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) from anon;
grant execute on function public.complete_ceo_plan(
  uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) to authenticated;

revoke all on function public.complete_ceo_plan(
  uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb
) from authenticated;
