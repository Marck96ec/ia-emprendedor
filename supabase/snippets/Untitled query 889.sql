select
  cp.week_number,
  wr.completed_actions,
  wr.total_actions,
  wr.what_worked,
  wr.what_didnt_work
from public.weekly_reviews wr
join public.ceo_plans cp
  on cp.id = wr.ceo_plan_id
order by cp.week_number;