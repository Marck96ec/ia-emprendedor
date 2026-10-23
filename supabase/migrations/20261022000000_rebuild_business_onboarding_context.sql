alter table public.businesses
  add column revenue_model text;

update public.businesses
set revenue_model = description
where revenue_model is null;

alter table public.businesses
  alter column description set not null,
  alter column revenue_model set not null,
  add constraint businesses_description_length_check
    check (char_length(description) between 10 and 1500),
  add constraint businesses_revenue_model_length_check
    check (char_length(revenue_model) between 10 and 1000),
  drop column business_type;

alter table public.business_diagnostics
  add column owner_hours_per_week integer,
  add column owner_responsibilities text;

alter table public.business_diagnostics
  alter column monthly_revenue set not null,
  alter column currency_code set not null,
  alter column owner_hours_per_week set not null,
  alter column owner_responsibilities set not null,
  add constraint business_diagnostics_owner_hours_check
    check (owner_hours_per_week between 0 and 168),
  add constraint business_diagnostics_owner_responsibilities_length_check
    check (char_length(owner_responsibilities) between 10 and 1500),
  drop constraint business_diagnostics_revenue_currency_check;