-- Allow company members to work with files only inside projects assigned to them.
drop policy if exists "Employees can read own project memberships" on public.crm_project_members;
create policy "Employees can read own project memberships"
  on public.crm_project_members for select using (profile_id in (
    select id
    from public.crm_profiles
    where auth_user_id = auth.uid()
      and role = 'company_member'
      and status = 'active'
  ));

drop policy if exists "Assigned employees can read project folders" on public.crm_project_folders;
create policy "Assigned employees can read project folders"
  on public.crm_project_folders for select using (
    public.get_user_role() = 'company_member'
    and public.is_project_member(project_id)
  );

drop policy if exists "Assigned employees can create project folders" on public.crm_project_folders;
create policy "Assigned employees can create project folders"
  on public.crm_project_folders for insert with check (
    public.get_user_role() = 'company_member'
    and public.is_project_member(project_id)
    and created_by = auth.uid()
  );

drop policy if exists "Assigned employees can read project files" on public.crm_project_files;
create policy "Assigned employees can read project files"
  on public.crm_project_files for select using (
    public.get_user_role() = 'company_member'
    and public.is_project_member(project_id)
  );

drop policy if exists "Assigned employees can add project files" on public.crm_project_files;
create policy "Assigned employees can add project files"
  on public.crm_project_files for insert with check (
    public.get_user_role() = 'company_member'
    and public.is_project_member(project_id)
    and uploaded_by = auth.uid()
  );

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
  if coalesce(array_length(parts, 1), 0) < 3
     or parts[1] <> 'projects'
     or parts[2] !~ '^[0-9]+$' then
    return false;
  end if;

  return public.is_company_admin()
    or (
      public.get_user_role() = 'company_member'
      and public.is_project_member(parts[2]::bigint)
    );
end;
$$;

-- Employees may upload new objects, but only admins may replace or remove them.
create or replace function public.can_manage_project_object(p_object_name text)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select public.is_company_admin();
$$;
