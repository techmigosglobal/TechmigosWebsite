-- Company-wide CRM settings are administrator-managed. Company members can
-- still create and manage operational records, but cannot change shared
-- company or invoice defaults.
drop policy if exists "Company staff can manage settings" on public.crm_settings;

create policy "Company admins can manage settings"
  on public.crm_settings for all
  using (public.is_company_admin())
  with check (public.is_company_admin());
