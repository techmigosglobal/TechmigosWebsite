-- Keep direct PostgREST client ticket writes aligned with the repository
-- workflow. A client may only create an open, unassigned ticket for its own
-- client record and one of its own linked projects.

drop policy if exists "CRM users can insert scoped tickets" on public.crm_tickets;
create policy "CRM users can insert scoped tickets"
  on public.crm_tickets for insert to authenticated
  with check (
    private.is_company_admin()
    or (
      private.get_user_role() = 'client'
      and client_id = private.get_user_client_id()
      and status = 'open'
      and assigned_user_id is null
      and coalesce(assigned_to, '') = ''
      and (
        project_id is null
        or project_id in (
          select project.id
          from public.crm_projects project
          where project.client_id = private.get_user_client_id()
        )
      )
    )
  );
