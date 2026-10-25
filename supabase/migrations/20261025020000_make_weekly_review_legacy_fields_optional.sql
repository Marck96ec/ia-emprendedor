alter table public.weekly_reviews
  alter column outcome_summary drop not null,
  alter column what_worked drop not null,
  alter column what_didnt_work drop not null,
  alter column business_changes drop not null;
