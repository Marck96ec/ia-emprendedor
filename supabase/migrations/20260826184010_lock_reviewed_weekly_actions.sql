/*
 * Una vez que una semana tiene revisión,
 * sus acciones pasan a ser históricas y
 * ya no pueden modificarse.
 */

drop policy if exists
  "Users can update their own weekly actions"
on public.weekly_actions;


create policy "Users can update their own open weekly actions"
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
  and not exists (
    select 1
    from public.weekly_reviews wr
    where wr.ceo_plan_id =
      weekly_actions.ceo_plan_id
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
  and not exists (
    select 1
    from public.weekly_reviews wr
    where wr.ceo_plan_id =
      weekly_actions.ceo_plan_id
  )
);