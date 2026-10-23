alter table public.ceo_plans
  add column strategic_diagnosis jsonb;

/*
 * Keep the existing RPC available for historical callers while allowing the
 * application to persist the strategic reasoning with the plan completion.
 */
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
begin
  perform public.complete_ceo_plan(
    p_plan_id,
    p_executive_summary,
    p_diagnosis,
    p_priorities,
    p_weekly_plan,
    p_actions
  );

  update public.ceo_plans
  set strategic_diagnosis = p_strategic_diagnosis
  where id = p_plan_id
    and status = 'ready';

  return p_plan_id;
end;
$$;

revoke all on function public.complete_ceo_plan(
  uuid, text, text, jsonb, jsonb, jsonb, jsonb
) from public;
revoke all on function public.complete_ceo_plan(
  uuid, text, text, jsonb, jsonb, jsonb, jsonb
) from anon;
grant execute on function public.complete_ceo_plan(
  uuid, text, text, jsonb, jsonb, jsonb, jsonb
) to authenticated;
