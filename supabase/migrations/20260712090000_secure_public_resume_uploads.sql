-- Public applications are intentionally accepted without an authenticated session.
-- Keep uploads narrowly scoped to the private resumes bucket; only staff can read them.
create policy "Applicants can upload approved resumes"
  on storage.objects for insert to anon
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = 'applications'
    and lower(storage.extension(name)) = any (array['pdf', 'doc', 'docx'])
    and coalesce((metadata ->> 'size')::bigint, 0) <= 5242880
  );

create policy "Company staff can read applicant resumes"
  on storage.objects for select
  using (
    bucket_id = 'resumes'
    and public.is_company_staff()
  );
