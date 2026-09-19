-- Restore the assigned employee workflow with explicit field and visibility limits.
-- This is intentionally additive after the project-only hardening migration.

create or replace function public.employee_update_project(p_project_id bigint, p_patch jsonb)
returns public.crm_projects
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_project public.crm_projects;
begin
  if public.get_user_role() <> 'company_member' or not public.is_project_member(p_project_id) then
    raise exception using errcode = '42501', message = 'You are not assigned to this project.';
  end if;
  if exists (
    select 1 from jsonb_object_keys(coalesce(p_patch, '{}'::jsonb)) key
    where key not in ('status', 'health', 'progress', 'summary', 'notes')
  ) then
    raise exception using errcode = '22023', message = 'This project field cannot be changed by an employee.';
  end if;

  update public.crm_projects
  set status = coalesce(nullif(p_patch->>'status', ''), status),
      health = coalesce(nullif(p_patch->>'health', ''), health),
      progress = coalesce((p_patch->>'progress')::integer, progress),
      summary = coalesce(p_patch->>'summary', summary),
      notes = coalesce(p_patch->>'notes', notes),
      updated_at = now()
  where id = p_project_id
  returning * into updated_project;
  return updated_project;
end;
$$;

create or replace function public.employee_update_ticket(p_ticket_id bigint, p_patch jsonb)
returns public.crm_tickets
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_ticket public.crm_tickets;
begin
  if public.get_user_role() <> 'company_member' or not public.can_access_ticket(p_ticket_id) then
    raise exception using errcode = '42501', message = 'You are not assigned to this ticket.';
  end if;
  if exists (
    select 1 from jsonb_object_keys(coalesce(p_patch, '{}'::jsonb)) key
    where key not in ('status', 'priority', 'description')
  ) then
    raise exception using errcode = '22023', message = 'This ticket field cannot be changed by an employee.';
  end if;

  update public.crm_tickets
  set status = coalesce(nullif(p_patch->>'status', ''), status),
      priority = coalesce(nullif(p_patch->>'priority', ''), priority),
      description = coalesce(p_patch->>'description', description),
      updated_at = now()
  where id = p_ticket_id
  returning * into updated_ticket;
  return updated_ticket;
end;
$$;

grant execute on function public.employee_update_project(bigint, jsonb) to authenticated;
grant execute on function public.employee_update_ticket(bigint, jsonb) to authenticated;

drop policy if exists "Assigned employees can read tickets" on public.crm_tickets;
create policy "Assigned employees can read tickets"
  on public.crm_tickets for select using (public.can_access_ticket(id));

drop policy if exists "Assigned employees can read ticket messages" on public.crm_ticket_messages;
create policy "Assigned employees can read ticket messages"
  on public.crm_ticket_messages for select using (public.can_access_ticket(ticket_id));

drop policy if exists "Assigned employees can add internal ticket messages" on public.crm_ticket_messages;
create policy "Assigned employees can add internal ticket messages"
  on public.crm_ticket_messages for insert with check (
    public.get_user_role() = 'company_member'
    and public.can_access_ticket(ticket_id)
    and visibility = 'internal'
    and author_role = 'company_member'
  );
