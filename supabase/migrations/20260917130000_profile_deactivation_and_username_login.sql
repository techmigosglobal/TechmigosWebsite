-- Keep CRM profile lifecycle administrative and make the login resolver match
-- the canonical username column created by the project-drive migration.

drop policy if exists "CRM admins can delete profiles" on public.crm_profiles;

create or replace function public.get_email_by_username(p_username text)
returns text
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select lower(trim(email))
  from public.crm_profiles
  where (lower(trim(username)) = lower(trim(p_username))
    or lower(trim(name)) = lower(trim(p_username)))
    and status = 'active'
  order by id
  limit 1;
$$;

revoke all on function public.get_email_by_username(text) from public;
grant execute on function public.get_email_by_username(text) to anon, service_role;
