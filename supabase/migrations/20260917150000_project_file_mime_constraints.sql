-- Keep the project drive's repository, table RLS, and private Storage bucket
-- aligned with the file types promised by the authenticated UI.

update storage.buckets
set public = false,
    file_size_limit = 52428800,
    allowed_mime_types = array[
      'application/pdf', 'text/plain', 'text/csv', 'application/json',
      'application/zip', 'application/x-zip-compressed',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/png', 'image/jpeg', 'image/webp'
    ]
where id = 'project-files';

drop policy if exists "Assigned company users can upload project files" on storage.objects;
create policy "Assigned company users can upload project files"
  on storage.objects for insert
  with check (
    bucket_id = 'project-files'
    and public.can_access_project_object(name)
    -- Storage validates object size and MIME type using this bucket's
    -- file_size_limit and allowed_mime_types. Avoid inspecting object metadata
    -- during INSERT; standard uploads can fail RLS before Storage has finalized
    -- the metadata row. The CRM file-row policy below repeats the constraints.
  );

drop policy if exists "Assigned employees can add project files" on public.crm_project_files;
create policy "Assigned employees can add project files"
  on public.crm_project_files for insert
  with check (
    public.get_user_role() = 'company_member'
    and public.is_project_member(project_id)
    and uploaded_by = auth.uid()
    and size_bytes between 0 and 52428800
    and mime_type = any (array[
      'application/pdf', 'text/plain', 'text/csv', 'application/json',
      'application/zip', 'application/x-zip-compressed',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/png', 'image/jpeg', 'image/webp'
    ])
  );
