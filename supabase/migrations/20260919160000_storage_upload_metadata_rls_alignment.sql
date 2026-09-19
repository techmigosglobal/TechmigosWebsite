-- Standard Storage uploads create the object row with server-derived metadata.
-- Enforce byte/MIME limits at the bucket boundary and keep storage.objects RLS
-- focused on the private bucket and assigned project path. crm_project_files
-- insert RLS validates the persisted MIME/size metadata after the upload.

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
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and private.can_access_project_object(name)
  );
