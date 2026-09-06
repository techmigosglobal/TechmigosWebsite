-- Inactive and pending CRM profiles must not retain data access through an
-- already-issued Auth session. Role helpers intentionally collapse them to
-- anon for all RLS decisions.
create or replace function public.get_user_role()
returns text
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role
     from public.crm_profiles
     where auth_user_id = auth.uid()
       and status = 'active'
     limit 1),
    'anon'
  );
$$;

create or replace function public.get_user_client_id()
returns bigint
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select (
    select client_id
    from public.crm_profiles
    where auth_user_id = auth.uid()
      and status = 'active'
    limit 1
  );
$$;

grant execute on function public.get_user_role() to authenticated;
grant execute on function public.get_user_client_id() to authenticated;
