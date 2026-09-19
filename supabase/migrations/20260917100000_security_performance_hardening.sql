-- Tighten the hosted CRM surface after the additive workspace migrations.
-- Public/anon access is retained only for the pre-auth username lookup used by
-- the login form. All CRM data and authorization helpers require a JWT.

alter function public.handle_updated_at() set search_path = public, pg_temp;
alter function public.generate_invoice_number() set search_path = public, pg_temp;

revoke all on function public.can_access_project_object(text) from public;
grant execute on function public.can_access_project_object(text) to authenticated, service_role;

revoke all on function public.can_access_ticket(bigint) from public;
grant execute on function public.can_access_ticket(bigint) to authenticated, service_role;

revoke all on function public.can_manage_project_object(text) from public;
grant execute on function public.can_manage_project_object(text) to authenticated, service_role;

revoke all on function public.employee_update_project(bigint, jsonb) from public;
grant execute on function public.employee_update_project(bigint, jsonb) to authenticated, service_role;

revoke all on function public.employee_update_ticket(bigint, jsonb) from public;
grant execute on function public.employee_update_ticket(bigint, jsonb) to authenticated, service_role;

revoke all on function public.get_email_by_username(text) from public;
grant execute on function public.get_email_by_username(text) to anon, service_role;

revoke all on function public.get_user_client_id() from public;
grant execute on function public.get_user_client_id() to authenticated, service_role;

revoke all on function public.get_user_role() from public;
grant execute on function public.get_user_role() to authenticated, service_role;

revoke all on function public.is_company_admin() from public;
grant execute on function public.is_company_admin() to authenticated, service_role;

revoke all on function public.is_company_staff() from public;
grant execute on function public.is_company_staff() to authenticated, service_role;

revoke all on function public.is_project_member(bigint) from public;
grant execute on function public.is_project_member(bigint) to authenticated, service_role;

revoke all on function public.record_crm_last_login() from public;
grant execute on function public.record_crm_last_login() to authenticated, service_role;

revoke all on function public.rls_auto_enable() from public;
grant execute on function public.rls_auto_enable() to service_role;

revoke all on function public.set_project_members(bigint, bigint[]) from public;
grant execute on function public.set_project_members(bigint, bigint[]) to authenticated, service_role;

-- Every CRM policy was historically created for PUBLIC. Keep the existing
-- predicates, but ensure the API role must be authenticated before they run.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename like 'crm_%'
      and 'public' = any (roles)
  loop
    execute format(
      'alter policy %I on %I.%I to authenticated',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;

  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and 'public' = any (roles)
  loop
    execute format(
      'alter policy %I on %I.%I to authenticated',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end;
$$;

create index if not exists crm_activities_user_id_idx on public.crm_activities (user_id);
create index if not exists crm_deals_client_id_idx on public.crm_deals (client_id);
create index if not exists crm_deals_lead_id_idx on public.crm_deals (lead_id);
create index if not exists crm_finances_client_id_idx on public.crm_finances (client_id);
create index if not exists crm_finances_invoice_id_idx on public.crm_finances (invoice_id);
create index if not exists crm_finances_project_id_idx on public.crm_finances (project_id);
create index if not exists crm_invoice_items_invoice_id_idx on public.crm_invoice_items (invoice_id);
create index if not exists crm_invoices_client_id_idx on public.crm_invoices (client_id);
create index if not exists crm_invoices_project_id_idx on public.crm_invoices (project_id);
create index if not exists crm_profiles_client_id_idx on public.crm_profiles (client_id);
create index if not exists crm_project_files_folder_id_idx on public.crm_project_files (folder_id);
create index if not exists crm_project_files_project_id_idx on public.crm_project_files (project_id);
create index if not exists crm_project_files_uploaded_by_idx on public.crm_project_files (uploaded_by);
create index if not exists crm_project_folders_created_by_idx on public.crm_project_folders (created_by);
create index if not exists crm_project_folders_parent_id_idx on public.crm_project_folders (parent_id);
create index if not exists crm_project_folders_project_id_idx on public.crm_project_folders (project_id);
create index if not exists crm_project_members_assigned_by_idx on public.crm_project_members (assigned_by);
create index if not exists crm_project_members_profile_id_idx on public.crm_project_members (profile_id);
create index if not exists crm_project_members_project_id_idx on public.crm_project_members (project_id);
create index if not exists crm_projects_client_id_idx on public.crm_projects (client_id);
create index if not exists crm_ticket_messages_ticket_id_idx on public.crm_ticket_messages (ticket_id);
create index if not exists crm_tickets_assigned_user_id_idx on public.crm_tickets (assigned_user_id);
create index if not exists crm_tickets_client_id_idx on public.crm_tickets (client_id);
create index if not exists crm_tickets_project_id_idx on public.crm_tickets (project_id);
