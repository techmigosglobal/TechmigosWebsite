-- Career applications intentionally accept anonymous submissions, but resume
-- objects remain private and must have the same server-side constraints as
-- authenticated CRM uploads.
update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]::text[]
where id = 'resumes';

drop policy if exists "Applicants can upload approved resumes" on storage.objects;

create policy "Applicants can upload approved resumes"
  on storage.objects
  for insert
  to anon
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = 'applications'
    and (storage.foldername(name))[2] ~ '^[0-9]{4}-[0-9]{2}$'
    and storage.filename(name) ~ '^[A-Za-z0-9][A-Za-z0-9._-]{1,120}$'
    and lower(storage.extension(name)) = any (array['pdf', 'doc', 'docx'])
    and lower(coalesce(metadata ->> 'mimetype', '')) = any (array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ])
    and coalesce((metadata ->> 'size')::bigint, 0) between 1 and 5242880
  );
