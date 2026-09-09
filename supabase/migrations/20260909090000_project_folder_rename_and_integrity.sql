-- Keep Drive-like folders safe to rename while preserving project isolation.

create or replace function public.validate_project_file_folder()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.folder_id is not null and not exists (
    select 1
    from public.crm_project_folders folder
    where folder.id = new.folder_id
      and folder.project_id = new.project_id
  ) then
    raise exception using errcode = '23514', message = 'Project files must be stored in a folder from the same project.';
  end if;
  return new;
end;
$$;

drop trigger if exists crm_project_files_validate_folder on public.crm_project_files;
create trigger crm_project_files_validate_folder
before insert or update of project_id, folder_id on public.crm_project_files
for each row execute function public.validate_project_file_folder();

drop policy if exists "Employees can rename own project folders" on public.crm_project_folders;
create policy "Employees can rename own project folders"
  on public.crm_project_folders for update
  using (
    public.get_user_role() = 'company_member'
    and created_by = auth.uid()
    and public.is_project_member(project_id)
  )
  with check (
    public.get_user_role() = 'company_member'
    and created_by = auth.uid()
    and public.is_project_member(project_id)
    and char_length(btrim(name)) between 1 and 120
  );
