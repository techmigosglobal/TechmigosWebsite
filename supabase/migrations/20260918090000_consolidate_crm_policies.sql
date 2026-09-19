-- Consolidate role predicates into one policy per table/action.
--
-- The previous migrations deliberately layered admin, employee, and client
-- policies while the role contract was being repaired.  PostgreSQL evaluates
-- permissive policies with OR semantics, so these combinations were correct
-- but produced avoidable multiple-permissive-policy warnings.  Keep the same
-- access boundaries in a single auditable predicate for each action.

-- Clients
drop policy if exists "CRM admins can manage clients" on public.crm_clients;
drop policy if exists "Clients can read own record" on public.crm_clients;
create policy "CRM clients can select scoped records"
  on public.crm_clients for select to authenticated
  using (private.is_company_admin() or id = private.get_user_client_id());
create policy "CRM admins can insert clients"
  on public.crm_clients for insert to authenticated
  with check (private.is_company_admin());
create policy "CRM admins can update clients"
  on public.crm_clients for update to authenticated
  using (private.is_company_admin())
  with check (private.is_company_admin());
create policy "CRM admins can delete clients"
  on public.crm_clients for delete to authenticated
  using (private.is_company_admin());

-- Projects
drop policy if exists "CRM admins can manage projects" on public.crm_projects;
drop policy if exists "Assigned employees can read projects" on public.crm_projects;
drop policy if exists "Clients can read own projects" on public.crm_projects;
create policy "CRM users can select scoped projects"
  on public.crm_projects for select to authenticated
  using (
    private.is_company_admin()
    or private.is_project_member(id)
    or client_id = private.get_user_client_id()
  );
create policy "CRM admins can insert projects"
  on public.crm_projects for insert to authenticated
  with check (private.is_company_admin());
create policy "CRM admins can update projects"
  on public.crm_projects for update to authenticated
  using (private.is_company_admin())
  with check (private.is_company_admin());
create policy "CRM admins can delete projects"
  on public.crm_projects for delete to authenticated
  using (private.is_company_admin());

-- Invoices
drop policy if exists "CRM admins can manage invoices" on public.crm_invoices;
drop policy if exists "Clients can read own invoices" on public.crm_invoices;
create policy "CRM users can select scoped invoices"
  on public.crm_invoices for select to authenticated
  using (private.is_company_admin() or client_id = private.get_user_client_id());
create policy "CRM admins can insert invoices"
  on public.crm_invoices for insert to authenticated
  with check (private.is_company_admin());
create policy "CRM admins can update invoices"
  on public.crm_invoices for update to authenticated
  using (private.is_company_admin())
  with check (private.is_company_admin());
create policy "CRM admins can delete invoices"
  on public.crm_invoices for delete to authenticated
  using (private.is_company_admin());

-- Invoice items
drop policy if exists "CRM admins can manage invoice items" on public.crm_invoice_items;
drop policy if exists "Clients can read own invoice items" on public.crm_invoice_items;
create policy "CRM users can select scoped invoice items"
  on public.crm_invoice_items for select to authenticated
  using (
    private.is_company_admin()
    or invoice_id in (
      select invoice.id
      from public.crm_invoices invoice
      where invoice.client_id = private.get_user_client_id()
    )
  );
create policy "CRM admins can insert invoice items"
  on public.crm_invoice_items for insert to authenticated
  with check (private.is_company_admin());
create policy "CRM admins can update invoice items"
  on public.crm_invoice_items for update to authenticated
  using (private.is_company_admin())
  with check (private.is_company_admin());
create policy "CRM admins can delete invoice items"
  on public.crm_invoice_items for delete to authenticated
  using (private.is_company_admin());

-- Project members
drop policy if exists "Admins can manage project members" on public.crm_project_members;
drop policy if exists "Employees can read own project memberships" on public.crm_project_members;
create policy "CRM users can select scoped project members"
  on public.crm_project_members for select to authenticated
  using (
    private.is_company_admin()
    or profile_id in (
      select profile.id
      from public.crm_profiles profile
      where profile.auth_user_id = (select auth.uid())
        and profile.role = 'company_member'
        and profile.status = 'active'
    )
  );
create policy "CRM admins can insert project members"
  on public.crm_project_members for insert to authenticated
  with check (private.is_company_admin());
create policy "CRM admins can update project members"
  on public.crm_project_members for update to authenticated
  using (private.is_company_admin())
  with check (private.is_company_admin());
create policy "CRM admins can delete project members"
  on public.crm_project_members for delete to authenticated
  using (private.is_company_admin());

-- Project folders
drop policy if exists "Admins can manage project folders" on public.crm_project_folders;
drop policy if exists "Assigned employees can read project folders" on public.crm_project_folders;
drop policy if exists "Assigned employees can create project folders" on public.crm_project_folders;
create policy "CRM users can select scoped project folders"
  on public.crm_project_folders for select to authenticated
  using (
    private.is_company_admin()
    or (private.get_user_role() = 'company_member' and private.is_project_member(project_id))
  );
create policy "CRM users can insert scoped project folders"
  on public.crm_project_folders for insert to authenticated
  with check (
    private.is_company_admin()
    or (
      private.get_user_role() = 'company_member'
      and private.is_project_member(project_id)
      and created_by = (select auth.uid())
    )
  );
create policy "CRM admins can update project folders"
  on public.crm_project_folders for update to authenticated
  using (private.is_company_admin())
  with check (private.is_company_admin());
create policy "CRM admins can delete project folders"
  on public.crm_project_folders for delete to authenticated
  using (private.is_company_admin());

-- Project files
drop policy if exists "Admins can manage project files" on public.crm_project_files;
drop policy if exists "Assigned employees can read project files" on public.crm_project_files;
drop policy if exists "Assigned employees can add project files" on public.crm_project_files;
create policy "CRM users can select scoped project files"
  on public.crm_project_files for select to authenticated
  using (
    private.is_company_admin()
    or (private.get_user_role() = 'company_member' and private.is_project_member(project_id))
  );
create policy "CRM users can insert scoped project files"
  on public.crm_project_files for insert to authenticated
  with check (
    (
      private.is_company_admin()
      or (
        private.get_user_role() = 'company_member'
        and private.is_project_member(project_id)
        and uploaded_by = (select auth.uid())
      )
    )
    and size_bytes between 0 and 52428800
    and mime_type = any (array[
      'application/pdf', 'text/plain', 'text/csv', 'application/json',
      'application/zip', 'application/x-zip-compressed', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/png', 'image/jpeg', 'image/webp'
    ])
  );
create policy "CRM admins can update project files"
  on public.crm_project_files for update to authenticated
  using (private.is_company_admin())
  with check (private.is_company_admin());
create policy "CRM admins can delete project files"
  on public.crm_project_files for delete to authenticated
  using (private.is_company_admin());

-- Tickets
drop policy if exists "CRM admins can manage tickets" on public.crm_tickets;
drop policy if exists "Assigned employees can read tickets" on public.crm_tickets;
drop policy if exists "Clients can insert own tickets" on public.crm_tickets;
drop policy if exists "Clients can read own tickets" on public.crm_tickets;
create policy "CRM users can select scoped tickets"
  on public.crm_tickets for select to authenticated
  using (
    private.is_company_admin()
    or (private.get_user_role() = 'company_member' and private.can_access_ticket(id))
    or client_id = private.get_user_client_id()
  );
create policy "CRM users can insert scoped tickets"
  on public.crm_tickets for insert to authenticated
  with check (private.is_company_admin() or client_id = private.get_user_client_id());
create policy "CRM admins can update tickets"
  on public.crm_tickets for update to authenticated
  using (private.is_company_admin())
  with check (private.is_company_admin());
create policy "CRM admins can delete tickets"
  on public.crm_tickets for delete to authenticated
  using (private.is_company_admin());

-- Ticket messages
drop policy if exists "CRM admins can manage ticket messages" on public.crm_ticket_messages;
drop policy if exists "Assigned employees can add internal ticket messages" on public.crm_ticket_messages;
drop policy if exists "Assigned employees can read ticket messages" on public.crm_ticket_messages;
drop policy if exists "Clients can insert own ticket messages" on public.crm_ticket_messages;
drop policy if exists "Clients can read own ticket messages" on public.crm_ticket_messages;
create policy "CRM users can select scoped ticket messages"
  on public.crm_ticket_messages for select to authenticated
  using (
    private.is_company_admin()
    or (
      private.get_user_role() = 'company_member'
      and private.can_access_ticket(ticket_id)
    )
    or (
      visibility = 'external'
      and ticket_id in (
        select ticket.id
        from public.crm_tickets ticket
        where ticket.client_id = private.get_user_client_id()
      )
    )
  );
create policy "CRM users can insert scoped ticket messages"
  on public.crm_ticket_messages for insert to authenticated
  with check (
    private.is_company_admin()
    or (
      private.get_user_role() = 'company_member'
      and private.can_access_ticket(ticket_id)
      and visibility = 'internal'
      and author_role = 'company_member'
    )
    or (
      visibility = 'external'
      and ticket_id in (
        select ticket.id
        from public.crm_tickets ticket
        where ticket.client_id = private.get_user_client_id()
      )
    )
  );
create policy "CRM admins can update ticket messages"
  on public.crm_ticket_messages for update to authenticated
  using (private.is_company_admin())
  with check (private.is_company_admin());
create policy "CRM admins can delete ticket messages"
  on public.crm_ticket_messages for delete to authenticated
  using (private.is_company_admin());
