select
  ceo_plan_id,
  count(*) as actions
from public.weekly_actions
group by ceo_plan_id;