select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'businesses';

  select
  relname,
  relrowsecurity
from pg_class
where relname = 'businesses';

select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'businesses'
  and grantee = 'authenticated'
order by privilege_type;

select
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename = 'business_diagnostics'
order by cmd;

select
  relname,
  relrowsecurity
from pg_class
where relname = 'business_diagnostics';


select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'business_diagnostics'
  and grantee = 'authenticated'
order by privilege_type;