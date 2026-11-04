alter table public.ceo_plans
  add column if not exists strategic_continuity jsonb;

alter table public.ceo_plans
  drop constraint if exists ceo_plans_strategic_continuity_check;

alter table public.ceo_plans
  add constraint ceo_plans_strategic_continuity_check
  check (
    strategic_continuity is null
    or (
      jsonb_typeof(strategic_continuity) = 'object'
      and strategic_continuity ? 'mode'
      and strategic_continuity ? 'justification'
      and strategic_continuity ? 'unresolved_uncertainty'
      and strategic_continuity ? 'new_verifiable_signal'
      and strategic_continuity ? 'prior_evidence_gap'
    )
  );

/*
 * Mantiene la función anterior para planes históricos y añade el nuevo
 * contrato de continuidad en una llamada atómica.
 */
create or replace function public.complete_ceo_plan(
  p_plan_id uuid,
  p_executive_summary text,
  p_diagnosis text,
  p_priorities jsonb,
  p_weekly_plan jsonb,
  p_actions jsonb,
  p_strategic_diagnosis jsonb,
  p_time_allocation jsonb,
  p_decision_hypothesis jsonb,
  p_strategic_continuity jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_strategic_continuity is not null
    and (
      jsonb_typeof(p_strategic_continuity) is distinct from 'object'
      or btrim(coalesce(p_strategic_continuity->>'mode', '')) = ''
      or btrim(coalesce(p_strategic_continuity->>'justification', '')) = ''
      or btrim(coalesce(p_strategic_continuity->>'unresolved_uncertainty', '')) = ''
      or btrim(coalesce(p_strategic_continuity->>'new_verifiable_signal', '')) = ''
      or btrim(coalesce(p_strategic_continuity->>'prior_evidence_gap', '')) = ''
    )
  then
    raise exception using
      errcode = '22023',
      message = 'CEO strategic continuity is invalid';
  end if;

  perform public.complete_ceo_plan(
    p_plan_id,
    p_executive_summary,
    p_diagnosis,
    p_priorities,
    p_weekly_plan,
    p_actions,
    p_strategic_diagnosis,
    p_time_allocation,
    p_decision_hypothesis
  );

  update public.ceo_plans
  set strategic_continuity = p_strategic_continuity
  where id = p_plan_id
    and status = 'ready';

  return p_plan_id;
end;
$$;

revoke all on function public.complete_ceo_plan(
  uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) from public, anon, service_role;

grant execute on function public.complete_ceo_plan(
  uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) to authenticated;
