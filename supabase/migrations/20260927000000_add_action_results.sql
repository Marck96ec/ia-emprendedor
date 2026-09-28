/*
 * IAE-F003: action execution metadata and approved action results.
 */

alter table public.weekly_actions
add column execution_mode text not null default 'manual'
  check (execution_mode in ('manual', 'ai_assisted'));

alter table public.weekly_actions
add column action_type text not null default 'generic'
  check (action_type in ('generic', 'value_proposition'));


create table public.action_results (
  id uuid primary key default gen_random_uuid(),

  weekly_action_id uuid not null unique
    references public.weekly_actions(id)
    on delete cascade,

  status text not null default 'draft'
    check (status in ('draft', 'approved')),

  draft_content jsonb,
  approved_content jsonb,

  revision integer not null default 1
    check (revision >= 1),

  model text,
  prompt_version text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,

  constraint action_results_state_check
    check (
      (
        status = 'draft'
        and draft_content is not null
        and approved_content is null
        and approved_at is null
      )
      or
      (
        status = 'approved'
        and draft_content is null
        and approved_content is not null
        and approved_at is not null
      )
    )
);


create trigger action_results_set_updated_at
before update on public.action_results
for each row
execute function public.set_updated_at();


grant select, insert, update
on table public.action_results
to authenticated;

revoke all
on table public.action_results
from anon;


alter table public.action_results
enable row level security;


create policy "Users can view their own action results"
on public.action_results
for select
to authenticated
using (
  weekly_action_id in (
    select wa.id
    from public.weekly_actions wa
    join public.ceo_plans cp
      on cp.id = wa.ceo_plan_id
    join public.businesses b
      on b.id = cp.business_id
    where b.owner_id = (select auth.uid())
  )
);


create policy "Users can create draft action results for their own open assisted actions"
on public.action_results
for insert
to authenticated
with check (
  status = 'draft'
  and draft_content is not null
  and approved_content is null
  and approved_at is null
  and weekly_action_id in (
    select wa.id
    from public.weekly_actions wa
    join public.ceo_plans cp
      on cp.id = wa.ceo_plan_id
    join public.businesses b
      on b.id = cp.business_id
    where b.owner_id = (select auth.uid())
      and wa.execution_mode = 'ai_assisted'
      and wa.status = 'pending'
      and not exists (
        select 1
        from public.weekly_reviews wr
        where wr.ceo_plan_id = wa.ceo_plan_id
      )
  )
);


create policy "Users can update their own draft action results"
on public.action_results
for update
to authenticated
using (
  status = 'draft'
  and weekly_action_id in (
    select wa.id
    from public.weekly_actions wa
    join public.ceo_plans cp
      on cp.id = wa.ceo_plan_id
    join public.businesses b
      on b.id = cp.business_id
    where b.owner_id = (select auth.uid())
      and wa.execution_mode = 'ai_assisted'
      and wa.status = 'pending'
      and not exists (
        select 1
        from public.weekly_reviews wr
        where wr.ceo_plan_id = wa.ceo_plan_id
      )
  )
)
with check (
  status = 'draft'
  and draft_content is not null
  and approved_content is null
  and approved_at is null
  and weekly_action_id in (
    select wa.id
    from public.weekly_actions wa
    join public.ceo_plans cp
      on cp.id = wa.ceo_plan_id
    join public.businesses b
      on b.id = cp.business_id
    where b.owner_id = (select auth.uid())
      and wa.execution_mode = 'ai_assisted'
      and wa.status = 'pending'
      and not exists (
        select 1
        from public.weekly_reviews wr
        where wr.ceo_plan_id = wa.ceo_plan_id
      )
  )
);


create or replace function public.approve_action_result(
  p_action_result_id uuid
)
returns table (
  id uuid,
  weekly_action_id uuid,
  status text,
  approved_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid;
  result_row public.action_results%rowtype;
  action_row public.weekly_actions%rowtype;
  action_owner_id uuid;
  has_review boolean;
  approval_time timestamptz;
begin
  current_user_id := (select auth.uid());

  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required';
  end if;

  /* Lock the result first, then the action, for a stable lock order. */
  select *
  into result_row
  from public.action_results
  where action_results.id = p_action_result_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Action result not found';
  end if;

  select *
  into action_row
  from public.weekly_actions
  where weekly_actions.id = result_row.weekly_action_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Weekly action not found';
  end if;

  select b.owner_id
  into action_owner_id
  from public.ceo_plans cp
  join public.businesses b
    on b.id = cp.business_id
  where cp.id = action_row.ceo_plan_id;

  if action_owner_id is distinct from current_user_id then
    raise exception using
      errcode = '42501',
      message = 'Action result does not belong to the current user';
  end if;

  /* A valid prior approval is safe to return on repeated requests. */
  if result_row.status = 'approved'
     and action_row.status = 'completed' then
    return query
    select
      result_row.id,
      result_row.weekly_action_id,
      result_row.status,
      result_row.approved_at;
    return;
  end if;

  if result_row.status <> 'draft' then
    raise exception using
      errcode = 'P0001',
      message = 'Action result is not a draft';
  end if;

  if action_row.execution_mode <> 'ai_assisted' then
    raise exception using
      errcode = 'P0001',
      message = 'Only AI-assisted actions can be approved';
  end if;

  if action_row.status <> 'pending' then
    raise exception using
      errcode = 'P0001',
      message = 'Weekly action is not pending';
  end if;

  select exists (
    select 1
    from public.weekly_reviews wr
    where wr.ceo_plan_id = action_row.ceo_plan_id
  )
  into has_review;

  if has_review then
    raise exception using
      errcode = 'P0001',
      message = 'The weekly plan is already closed';
  end if;

  approval_time := clock_timestamp();

  update public.action_results
  set
    status = 'approved',
    approved_content = result_row.draft_content,
    draft_content = null,
    approved_at = approval_time,
    updated_at = approval_time
  where action_results.id = result_row.id
    and action_results.status = 'draft';

  update public.weekly_actions
  set
    status = 'completed',
    completed_at = approval_time
  where weekly_actions.id = action_row.id
    and weekly_actions.status = 'pending';

  return query
  select
    result_row.id,
    result_row.weekly_action_id,
    'approved'::text,
    approval_time;
end;
$$;


revoke all
on function public.approve_action_result(uuid)
from public, anon, service_role;

grant execute
on function public.approve_action_result(uuid)
to authenticated;
