create table public.business_diagnostics (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null unique
    references public.businesses(id)
    on delete cascade,

  business_stage text not null
    check (
      business_stage in (
        'starting',
        'operating',
        'growing',
        'stalled'
      )
    ),

  team_size integer not null default 1
    check (team_size >= 1 and team_size <= 10000),

  main_challenge text not null
    check (char_length(main_challenge) between 10 and 1000),

  primary_goal text not null
    check (char_length(primary_goal) between 10 and 1000),

  customers_description text not null
    check (char_length(customers_description) between 10 and 1000),

  sales_process text not null
    check (char_length(sales_process) between 10 and 1500),

  monthly_revenue numeric(14, 2)
    check (monthly_revenue is null or monthly_revenue >= 0),

  currency_code text
    check (
      currency_code is null
      or char_length(currency_code) = 3
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint business_diagnostics_revenue_currency_check
    check (
      (monthly_revenue is null and currency_code is null)
      or
      (monthly_revenue is not null and currency_code is not null)
    )
);


-- Reutilizamos la función set_updated_at creada
-- en la migración de businesses.
create trigger business_diagnostics_set_updated_at
before update on public.business_diagnostics
for each row
execute function public.set_updated_at();


-- Permisos SQL.
grant select, insert, update
on table public.business_diagnostics
to authenticated;


-- Sin acceso para usuarios no autenticados.
revoke all
on table public.business_diagnostics
from anon;


-- Activar RLS.
alter table public.business_diagnostics
enable row level security;


-- SELECT:
-- el usuario solamente puede leer el diagnóstico
-- de su propio negocio.
create policy "Users can view their own business diagnostic"
on public.business_diagnostics
for select
to authenticated
using (
  business_id in (
    select id
    from public.businesses
    where owner_id = (select auth.uid())
  )
);


-- INSERT:
-- solo puede crear diagnóstico para su propio negocio.
create policy "Users can create their own business diagnostic"
on public.business_diagnostics
for insert
to authenticated
with check (
  business_id in (
    select id
    from public.businesses
    where owner_id = (select auth.uid())
  )
);


-- UPDATE:
-- solo puede modificar el diagnóstico de su propio negocio.
create policy "Users can update their own business diagnostic"
on public.business_diagnostics
for update
to authenticated
using (
  business_id in (
    select id
    from public.businesses
    where owner_id = (select auth.uid())
  )
)
with check (
  business_id in (
    select id
    from public.businesses
    where owner_id = (select auth.uid())
  )
);