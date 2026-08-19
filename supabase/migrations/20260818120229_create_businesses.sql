create table public.businesses (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null
    check (char_length(name) between 2 and 120),

  business_type text,

  description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint businesses_one_per_owner unique (owner_id)
);


-- Mantener updated_at automáticamente actualizado
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


create trigger businesses_set_updated_at
before update on public.businesses
for each row
execute function public.set_updated_at();


-- Activar Row Level Security
alter table public.businesses
enable row level security;


-- Un usuario autenticado solo puede leer su propio negocio
create policy "Users can view their own business"
on public.businesses
for select
to authenticated
using (
  (select auth.uid()) = owner_id
);


-- Un usuario autenticado solo puede crear su propio negocio
create policy "Users can create their own business"
on public.businesses
for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
);


-- Un usuario autenticado solo puede modificar su propio negocio
create policy "Users can update their own business"
on public.businesses
for update
to authenticated
using (
  (select auth.uid()) = owner_id
)
with check (
  (select auth.uid()) = owner_id
);