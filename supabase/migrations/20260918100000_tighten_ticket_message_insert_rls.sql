-- Keep direct PostgREST writes aligned with the repository conversation
-- workflow. Employees may only create internal notes; clients may only
-- create external replies; administrators may create external responses.

drop policy if exists "CRM users can insert scoped ticket messages" on public.crm_ticket_messages;
create policy "CRM users can insert scoped ticket messages"
  on public.crm_ticket_messages for insert to authenticated
  with check (
    (
      private.is_company_admin()
      and author_role = 'company_admin'
    )
    or (
      private.get_user_role() = 'company_member'
      and private.can_access_ticket(ticket_id)
      and visibility = 'internal'
      and author_role = 'company_member'
    )
    or (
      private.get_user_role() = 'client'
      and visibility = 'external'
      and author_role = 'client'
      and ticket_id in (
        select ticket.id
        from public.crm_tickets ticket
        where ticket.client_id = private.get_user_client_id()
      )
    )
  );
