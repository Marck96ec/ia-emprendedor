alter table public.ceo_plans
	drop constraint if exists ceo_plans_weekly_plan_array_check;

alter table public.ceo_plans
	add constraint ceo_plans_weekly_plan_array_check
	check (
		weekly_plan is null
		or (
			jsonb_typeof(weekly_plan) = 'array'
			and jsonb_array_length(weekly_plan) between 1 and 5
		)
	);
