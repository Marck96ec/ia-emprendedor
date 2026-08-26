/*
 * =========================================================
 * 1. Permitir múltiples planes CEO por negocio
 * =========================================================
 */

alter table public.ceo_plans
drop constraint if exists ceo_plans_business_id_key;


alter table public.ceo_plans
add column week_number integer not null default 1
  check (week_number >= 1);


alter table public.ceo_plans
add column previous_plan_id uuid
  references public.ceo_plans(id)
  on delete set null;


alter table public.ceo_plans
add constraint ceo_plans_business_week_unique
unique (business_id, week_number);


/*
 * Evita que un plan se marque a sí mismo
 * como su plan anterior.
 */
alter table public.ceo_plans
add constraint ceo_plans_previous_plan_check
check (
  previous_plan_id is null
  or previous_plan_id <> id
);


/*
 * =========================================================
 * 2. Revisión semanal
 * =========================================================
 */

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),

  ceo_plan_id uuid not null unique
    references public.ceo_plans(id)
    on delete cascade,

  what_worked text not null
    check (
      char_length(what_worked)
      between 5 and 2000
    ),

  what_didnt_work text not null
    check (
      char_length(what_didnt_work)
      between 5 and 2000
    ),

  business_changes text not null
    check (
      char_length(business_changes)
      between 5 and 2000
    ),

  next_week_focus text
    check (
      next_week_focus is null
      or char_length(next_week_focus)
        between 5 and 1000
    ),

  completed_actions integer not null
    check (
      completed_actions
      between 0 and 7
    ),

  total_actions integer not null default 7
    check (
      total_actions = 7
    ),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


create trigger weekly_reviews_set_updated_at
before update on public.weekly_reviews
for each row
execute function public.set_updated_at();


/*
 * =========================================================
 * 3. Permisos
 * =========================================================
 */

grant select, insert, update
on table public.weekly_reviews
to authenticated;


revoke all
on table public.weekly_reviews
from anon;


/*
 * =========================================================
 * 4. RLS
 * =========================================================
 */

alter table public.weekly_reviews
enable row level security;


create policy "Users can view their own weekly reviews"
on public.weekly_reviews
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


create policy "Users can create their own weekly reviews"
on public.weekly_reviews
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


create policy "Users can update their own weekly reviews"
on public.weekly_reviews
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