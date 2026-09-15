-- Restrict company employees to assigned project details only.
-- Project visibility remains assignment-scoped. Remove employee access to all
-- other CRM tables while preserving the existing Admin and Client policies.
drop policy if exists "CRM employees can read clients" on public.crm_clients;
drop policy if exists "Assigned employees can read linked clients" on public.crm_clients;

drop policy if exists "CRM employees can read tickets" on public.crm_tickets;
drop policy if exists "Assigned employees can read tickets" on public.crm_tickets;

drop policy if exists "CRM employees can read ticket messages" on public.crm_ticket_messages;
drop policy if exists "Assigned employees can read ticket messages" on public.crm_ticket_messages;
drop policy if exists "Assigned employees can add internal ticket messages" on public.crm_ticket_messages;

drop policy if exists "CRM employees can read invoices" on public.crm_invoices;
drop policy if exists "CRM employees can read invoice items" on public.crm_invoice_items;
drop policy if exists "CRM employees can read finances" on public.crm_finances;
drop policy if exists "CRM employees can read activities" on public.crm_activities;

drop policy if exists "Employees can read own project memberships" on public.crm_project_members;

drop policy if exists "Assigned employees can read project folders" on public.crm_project_folders;
drop policy if exists "Assigned employees can create project folders" on public.crm_project_folders;
drop policy if exists "Employees can rename own project folders" on public.crm_project_folders;
drop policy if exists "Employees can delete their project folders" on public.crm_project_folders;

drop policy if exists "Assigned employees can read project files" on public.crm_project_files;
drop policy if exists "Assigned employees can add project files" on public.crm_project_files;
drop policy if exists "Employees can delete their project files" on public.crm_project_files;

-- Keep the private project-files bucket available to Admins, but do not allow
-- employee membership to bypass the project-only application boundary.
create or replace function public.can_access_project_object(p_object_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  parts text[] := string_to_array(p_object_name, '/');
begin
  if coalesce(array_length(parts, 1), 0) < 3 or parts[1] <> 'projects' or parts[2] !~ '^[0-9]+$' then
    return false;
  end if;
  return public.is_company_admin();
end;
$$;

create or replace function public.can_manage_project_object(p_object_name text)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select public.is_company_admin();
$$;

-- Employees no longer mutate project or ticket data through the legacy RPCs.
revoke execute on function public.employee_update_project(bigint, jsonb) from authenticated;
revoke execute on function public.employee_update_ticket(bigint, jsonb) from authenticated;
