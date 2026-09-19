-- Keep policy-only SECURITY DEFINER helpers out of the exposed public API
-- schema. Controlled workspace RPCs remain public and continue to call these
-- public compatibility functions as their definer owner.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.get_user_role()
returns text
language sql stable security definer
set search_path = public, private, pg_temp
as $$
  select coalesce(
    (select role from public.crm_profiles
     where auth_user_id = auth.uid() and status = 'active' limit 1),
    'anon'
  );
$$;

create or replace function private.get_user_client_id()
returns bigint
language sql stable security definer
set search_path = public, private, pg_temp
as $$
  select (select client_id from public.crm_profiles
          where auth_user_id = auth.uid() and status = 'active' limit 1);
$$;

create or replace function private.is_company_admin()
returns boolean
language sql stable security definer
set search_path = public, private, pg_temp
as $$ select private.get_user_role() = 'company_admin'; $$;

create or replace function private.is_company_staff()
returns boolean
language sql stable security definer
set search_path = public, private, pg_temp
as $$ select private.get_user_role() in ('company_admin', 'company_member'); $$;

create or replace function private.is_project_member(p_project_id bigint)
returns boolean
language sql stable security definer
set search_path = public, private, pg_temp
as $$
  select private.is_company_admin() or exists (
    select 1
    from public.crm_project_members member
    join public.crm_profiles profile on profile.id = member.profile_id
    where member.project_id = p_project_id
      and profile.auth_user_id = auth.uid()
      and profile.status = 'active'
  );
$$;

create or replace function private.can_access_ticket(p_ticket_id bigint)
returns boolean
language sql stable security definer
set search_path = public, private, pg_temp
as $$
  select private.is_company_admin() or exists (
    select 1 from public.crm_tickets ticket
    where ticket.id = p_ticket_id
      and (ticket.assigned_user_id = auth.uid() or private.is_project_member(ticket.project_id))
  );
$$;

create or replace function private.can_access_project_object(p_object_name text)
returns boolean
language plpgsql stable security definer
set search_path = public, private, pg_temp
as $$
declare
  parts text[] := string_to_array(coalesce(p_object_name, ''), '/');
begin
  if coalesce(array_length(parts, 1), 0) <> 3
     or parts[1] <> 'projects'
     or parts[2] !~ '^[0-9]{1,18}$'
     or parts[3] !~ '^[A-Za-z0-9._-]{1,255}$' then
    return false;
  end if;
  return private.is_company_admin()
    or (private.get_user_role() = 'company_member'
        and private.is_project_member(parts[2]::bigint));
end;
$$;

create or replace function private.can_manage_project_object(p_object_name text)
returns boolean
language sql stable security definer
set search_path = public, private, pg_temp
as $$ select private.is_company_admin(); $$;

grant execute on function private.get_user_role() to authenticated;
grant execute on function private.get_user_client_id() to authenticated;
grant execute on function private.is_company_admin() to authenticated;
grant execute on function private.is_company_staff() to authenticated;
grant execute on function private.is_project_member(bigint) to authenticated;
grant execute on function private.can_access_ticket(bigint) to authenticated;
grant execute on function private.can_access_project_object(text) to authenticated;
grant execute on function private.can_manage_project_object(text) to authenticated;

do $$
declare
  policy_row record;
  using_expr text;
  check_expr text;
  statement text;
  helper text;
  helpers text[] := array[
    'can_access_project_object', 'can_access_ticket', 'can_manage_project_object',
    'get_user_client_id', 'get_user_role', 'is_company_admin',
    'is_company_staff', 'is_project_member'
  ];
begin
  for policy_row in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where (schemaname = 'public' and tablename like 'crm_%')
       or (schemaname = 'storage' and tablename = 'objects')
  loop
    using_expr := policy_row.qual;
    check_expr := policy_row.with_check;
    foreach helper in array helpers loop
      using_expr := replace(using_expr, 'public.' || helper || '(', 'private.' || helper || '(');
      check_expr := replace(check_expr, 'public.' || helper || '(', 'private.' || helper || '(');
      using_expr := regexp_replace(using_expr, '(^|[^A-Za-z0-9_.])' || helper || '\(', '\1private.' || helper || '(', 'g');
      check_expr := regexp_replace(check_expr, '(^|[^A-Za-z0-9_.])' || helper || '\(', '\1private.' || helper || '(', 'g');
    end loop;
    if using_expr is distinct from policy_row.qual or check_expr is distinct from policy_row.with_check then
      statement := format('alter policy %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
      if using_expr is not null then statement := statement || format(' using (%s)', using_expr); end if;
      if check_expr is not null then statement := statement || format(' with check (%s)', check_expr); end if;
      execute statement;
    end if;
  end loop;
end;
$$;

-- These helpers are now reached by RLS through private.*. Keep public names
-- only as compatibility dependencies of the controlled public RPCs.
revoke all on function public.can_access_project_object(text) from public, authenticated;
revoke all on function public.can_access_ticket(bigint) from public, authenticated;
revoke all on function public.can_manage_project_object(text) from public, authenticated;
revoke all on function public.get_user_client_id() from public, authenticated;
revoke all on function public.get_user_role() from public, authenticated;
revoke all on function public.is_company_admin() from public, authenticated;
revoke all on function public.is_company_staff() from public, authenticated;
revoke all on function public.is_project_member(bigint) from public, authenticated;
