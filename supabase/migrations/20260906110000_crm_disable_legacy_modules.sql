-- Disabled CRM modules remain unavailable to clients and employees at the
-- database boundary. Admins retain maintenance access for future enablement.

do $$
declare
  table_name text;
  disabled_tables text[] := array[
    'crm_leads', 'crm_deals', 'crm_followups', 'crm_campaigns'
  ];
begin
  foreach table_name in array disabled_tables loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

drop policy if exists "Company staff can manage leads" on public.crm_leads;
drop policy if exists "Anyone can insert leads" on public.crm_leads;
drop policy if exists "CRM admins can manage disabled leads" on public.crm_leads;
create policy "CRM admins can manage disabled leads"
  on public.crm_leads for all
  using (public.is_company_admin())
  with check (public.is_company_admin());

drop policy if exists "Company staff can manage deals" on public.crm_deals;
drop policy if exists "CRM admins can manage disabled deals" on public.crm_deals;
create policy "CRM admins can manage disabled deals"
  on public.crm_deals for all
  using (public.is_company_admin())
  with check (public.is_company_admin());

drop policy if exists "Company staff can manage followups" on public.crm_followups;
drop policy if exists "CRM admins can manage disabled followups" on public.crm_followups;
create policy "CRM admins can manage disabled followups"
  on public.crm_followups for all
  using (public.is_company_admin())
  with check (public.is_company_admin());

drop policy if exists "Company staff can manage campaigns" on public.crm_campaigns;
drop policy if exists "CRM admins can manage disabled campaigns" on public.crm_campaigns;
create policy "CRM admins can manage disabled campaigns"
  on public.crm_campaigns for all
  using (public.is_company_admin())
  with check (public.is_company_admin());

revoke all on function public.save_invoice_with_items(jsonb, jsonb) from public;
grant execute on function public.save_invoice_with_items(jsonb, jsonb) to authenticated;
