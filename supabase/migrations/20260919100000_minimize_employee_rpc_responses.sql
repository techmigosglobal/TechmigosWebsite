-- Employee mutation RPCs must return only the operational fields that the
-- employee workspace is allowed to receive. Returning a table row here would
-- send financial and internal columns to the browser before any UI trimming.

drop function if exists public.employee_update_project(bigint, jsonb);
drop function if exists public.employee_update_ticket(bigint, jsonb);

create function public.employee_update_project(p_project_id bigint, p_patch jsonb)
returns jsonb
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

  return jsonb_build_object(
    'id', updated_project.id,
    'client_id', updated_project.client_id,
    'name', updated_project.name,
    'client_name', updated_project.client_name,
    'project_manager', updated_project.project_manager,
    'status', updated_project.status,
    'health', updated_project.health,
    'progress', updated_project.progress,
    'due_date', updated_project.due_date,
    'summary', updated_project.summary,
    'notes', updated_project.notes,
    'created_at', updated_project.created_at,
    'updated_at', updated_project.updated_at
  );
end;
$$;

create function public.employee_update_ticket(p_ticket_id bigint, p_patch jsonb)
returns jsonb
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

  return jsonb_build_object(
    'id', updated_ticket.id,
    'client_id', updated_ticket.client_id,
    'project_id', updated_ticket.project_id,
    'subject', updated_ticket.subject,
    'description', updated_ticket.description,
    'priority', updated_ticket.priority,
    'status', updated_ticket.status,
    'assigned_to', updated_ticket.assigned_to,
    'created_at', updated_ticket.created_at,
    'updated_at', updated_ticket.updated_at
  );
end;
$$;

revoke all on function public.employee_update_project(bigint, jsonb) from public;
revoke all on function public.employee_update_ticket(bigint, jsonb) from public;
grant execute on function public.employee_update_project(bigint, jsonb) to authenticated, service_role;
grant execute on function public.employee_update_ticket(bigint, jsonb) to authenticated, service_role;
