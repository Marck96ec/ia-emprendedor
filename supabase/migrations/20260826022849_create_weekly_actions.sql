create table public.weekly_actions (
  id uuid primary key default gen_random_uuid(),

  ceo_plan_id uuid not null
    references public.ceo_plans(id)
    on delete cascade,

  day integer not null
    check (day between 1 and 7),

  action text not null
    check (char_length(action) between 2 and 1000),

  objective text not null
    check (char_length(objective) between 2 and 1000),

  success_metric text not null
    check (char_length(success_metric) between 2 and 1000),

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'completed'
      )
    ),

  completed_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint weekly_actions_one_action_per_day
    unique (ceo_plan_id, day),

  constraint weekly_actions_completed_state_check
    check (
      (
        status = 'pending'
        and completed_at is null
      )
      or
      (
        status = 'completed'
        and completed_at is not null
      )
    )
);


create trigger weekly_actions_set_updated_at
before update on public.weekly_actions
for each row
execute function public.set_updated_at();


grant select, insert, update
on table public.weekly_actions
to authenticated;


revoke all
on table public.weekly_actions
from anon;


alter table public.weekly_actions
enable row level security;


create policy "Users can view their own weekly actions"
on public.weekly_actions
for select
to authenticated
using (
  ceo_plan_id in (
    select cp.id
    from public.ceo_plans cp
    join public.businesses b
      on b.id = cp.business_id
    where b.owner_id = (select auth.uid())
  )
);


create policy "Users can create their own weekly actions"
on public.weekly_actions
for insert
to authenticated
with check (
  ceo_plan_id in (
    select cp.id
    from public.ceo_plans cp
    join public.businesses b
      on b.id = cp.business_id
    where b.owner_id = (select auth.uid())
  )
);


create policy "Users can update their own weekly actions"
on public.weekly_actions
for update
to authenticated
using (
  ceo_plan_id in (
    select cp.id
    from public.ceo_plans cp
    join public.businesses b
      on b.id = cp.business_id
    where b.owner_id = (select auth.uid())
  )
)
with check (
  ceo_plan_id in (
    select cp.id
    from public.ceo_plans cp
    join public.businesses b
      on b.id = cp.business_id
    where b.owner_id = (select auth.uid())
  )
);