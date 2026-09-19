-- Keep authorization predicates stable per statement and remove duplicate
-- foreign-key indexes introduced by overlapping historical migrations.
-- These changes are additive to the existing RLS contract.

alter policy "CRM admins can insert activities" on public.crm_activities
  with check ((select is_company_admin()) and user_id = (select auth.uid()));

alter policy "CRM admins can read profiles" on public.crm_profiles
  using ((select is_company_admin()) or ((select auth.uid()) = auth_user_id));

alter policy "Assigned employees can add project files" on public.crm_project_files
  with check (
    (get_user_role() = 'company_member')
    and is_project_member(project_id)
    and uploaded_by = (select auth.uid())
  );

alter policy "Assigned employees can create project folders" on public.crm_project_folders
  with check (
    (get_user_role() = 'company_member')
    and is_project_member(project_id)
    and created_by = (select auth.uid())
  );

alter policy "Employees can read own project memberships" on public.crm_project_members
  using (
    profile_id in (
      select id
      from public.crm_profiles
      where auth_user_id = (select auth.uid())
        and role = 'company_member'
        and status = 'active'
    )
  );

drop index if exists public.crm_finances_invoice_id_idx;
drop index if exists public.crm_invoice_items_invoice_id_idx;
drop index if exists public.crm_invoices_client_id_idx;
drop index if exists public.crm_projects_client_id_idx;
drop index if exists public.crm_ticket_messages_ticket_id_idx;
drop index if exists public.crm_tickets_client_id_idx;
