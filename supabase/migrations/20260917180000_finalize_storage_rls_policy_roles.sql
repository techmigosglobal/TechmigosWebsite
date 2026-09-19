-- Policies introduced after the broad CRM hardening migration must carry the
-- same authenticated-only role boundary and use init-plan-friendly auth calls.
alter policy "Assigned employees can add project files"
  on public.crm_project_files to authenticated
  with check (
    (select public.get_user_role()) = 'company_member'
    and (select public.is_project_member(project_id))
    and uploaded_by = (select auth.uid())
    and size_bytes between 0 and 52428800
    and mime_type = any (array[
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/json',
      'application/zip',
      'application/x-zip-compressed',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/png',
      'image/jpeg',
      'image/webp'
    ])
  );

alter policy "Assigned company users can upload project files"
  on storage.objects to authenticated;
