insert into public.weekly_actions (
  ceo_plan_id,
  day,
  action,
  objective,
  success_metric
)
select
  cp.id,
  (item->>'day')::integer,
  item->>'action',
  item->>'objective',
  item->>'success_metric'
from public.ceo_plans cp
cross join lateral jsonb_array_elements(
  cp.weekly_plan
) as item
where cp.status = 'ready'
  and cp.weekly_plan is not null
on conflict (ceo_plan_id, day)
do nothing;