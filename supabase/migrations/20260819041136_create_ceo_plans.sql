create table public.ceo_plans (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null unique
    references public.businesses(id)
    on delete cascade,

  status text not null default 'generating'
    check (
      status in (
        'generating',
        'ready',
        'failed'
      )
    ),

  executive_summary text,

  diagnosis text,

  priorities jsonb,

  weekly_plan jsonb,

  model text not null,

  prompt_version text not null default 'v1',

  generated_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint ceo_plans_priorities_array_check
    check (
      priorities is null
      or (
        jsonb_typeof(priorities) = 'array'
        and jsonb_array_length(priorities) = 3
      )
    ),

  constraint ceo_plans_weekly_plan_array_check
    check (
      weekly_plan is null
      or (
        jsonb_typeof(weekly_plan) = 'array'
        and jsonb_array_length(weekly_plan) = 7
      )
    ),

  constraint ceo_plans_ready_output_check
    check (
      status <> 'ready'
      or (
        executive_summary is not null
        and diagnosis is not null
        and priorities is not null
        and weekly_plan is not null
        and generated_at is not null
      )
    )
);


create trigger ceo_plans_set_updated_at
before update on public.ceo_plans
for each row
execute function public.set_updated_at();


grant select, insert, update
on table public.ceo_plans
to authenticated;


revoke all
on table public.ceo_plans
from anon;


alter table public.ceo_plans
enable row level security;


create policy "Users can view their own CEO plan"
on public.ceo_plans
for select
to authenticated
using (
  business_id in (
    select id
    from public.businesses
    where owner_id = (select auth.uid())
  )
);


create policy "Users can create their own CEO plan"
on public.ceo_plans
for insert
to authenticated
with check (
  business_id in (
    select id
    from public.businesses
    where owner_id = (select auth.uid())
  )
);


create policy "Users can update their own CEO plan"
on public.ceo_plans
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