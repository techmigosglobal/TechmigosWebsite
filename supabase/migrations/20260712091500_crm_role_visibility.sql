-- Keep employee and user-account directories inside administrator-only CRM workflows.
-- Company members retain access to their own profile through the existing policy.
create or replace function public.is_company_admin()
returns boolean
language sql
security definer
stable
as $$
  select public.get_user_role() = 'company_admin';
$$;

drop policy if exists "Company staff can read all profiles" on public.crm_profiles;

create policy "Company admins can read all profiles"
  on public.crm_profiles for select
  using (public.is_company_admin());
