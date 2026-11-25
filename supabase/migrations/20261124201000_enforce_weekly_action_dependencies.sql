-- Weekly strategy is stored in the versioned plan JSON. Old plans without a
-- dependency continue through the existing evidence RPC unchanged.
create function public.enforce_weekly_action_dependency()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  prerequisite text;
begin
  if old.status = 'completed' or new.status <> 'completed' then
    return new;
  end if;

  select item->'strategy'->>'depends_on_sequence'
    into prerequisite
    from public.ceo_plans cp
    cross join lateral jsonb_array_elements(cp.weekly_plan) item
    where cp.id = new.ceo_plan_id and item->>'sequence' = new.sequence::text
    limit 1;

  if prerequisite is null then
    return new;
  end if;

  if prerequisite !~ '^[1-5]$' then
    raise exception using errcode = '22023', hint = 'ACTION_DEPENDENCY_PENDING', message = 'Invalid weekly dependency';
  end if;

  if prerequisite::integer >= new.sequence or not exists (
    select 1 from public.weekly_actions wa where wa.ceo_plan_id = new.ceo_plan_id
      and wa.sequence = prerequisite::integer and wa.status = 'completed'
  ) then
    raise exception using errcode = '22023', hint = 'ACTION_DEPENDENCY_PENDING', message = 'Weekly dependency is incomplete';
  end if;
  return new;
end;
$$;

create trigger weekly_actions_enforce_dependency
before update of status on public.weekly_actions
for each row execute function public.enforce_weekly_action_dependency();

revoke all on function public.enforce_weekly_action_dependency() from public, anon, authenticated;

