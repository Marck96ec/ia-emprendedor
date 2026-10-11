/*
 * IAE-F006: capture business outcome separately from execution.
 */

alter table public.weekly_reviews
  add column outcome_status text,
  add column outcome_summary text;

update public.weekly_reviews
set
  outcome_status = 'no_change',
  outcome_summary = 'Resultado no clasificado porque esta revisión fue creada antes del seguimiento de resultados.'
where outcome_status is null
   or outcome_summary is null;

alter table public.weekly_reviews
  alter column outcome_status set not null,
  alter column outcome_summary set not null,
  add constraint weekly_reviews_outcome_status_check
    check (outcome_status in ('positive', 'mixed', 'no_change', 'negative')),
  add constraint weekly_reviews_outcome_summary_check
    check (char_length(outcome_summary) between 5 and 1000);