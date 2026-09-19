-- Keep direct Storage API uploads within the same private project-file path
-- and size contract enforced by the repository.

create or replace function public.can_access_project_object(p_object_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  parts text[] := string_to_array(coalesce(p_object_name, ''), '/');
begin
  if coalesce(array_length(parts, 1), 0) <> 3
     or parts[1] <> 'projects'
     or parts[2] !~ '^[0-9]{1,18}$'
     or parts[3] !~ '^[A-Za-z0-9._-]{1,255}$' then
    return false;
  end if;

  return public.is_company_admin()
    or (
      public.get_user_role() = 'company_member'
      and public.is_project_member(parts[2]::bigint)
    );
end;
$$;

drop policy if exists "Assigned company users can upload project files" on storage.objects;
create policy "Assigned company users can upload project files"
  on storage.objects for insert
  with check (
    bucket_id = 'project-files'
    and public.can_access_project_object(name)
    and coalesce(metadata->>'size', '') ~ '^[0-9]{1,8}$'
    and (metadata->>'size')::bigint <= 52428800
  );
