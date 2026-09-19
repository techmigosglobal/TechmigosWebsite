-- Finance is administrator-only. Keep employee project-file access separate
-- from finance proof access, even when an employee guesses a storage path.
drop policy if exists "CRM staff can read finance proofs" on storage.objects;
drop policy if exists "CRM admins can read finance proofs" on storage.objects;

create policy "CRM admins can read finance proofs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'finance-proofs'
    and (select private.is_company_admin())
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and (storage.foldername(name))[1] = 'records'
    and (storage.foldername(name))[2] ~ '^[0-9]{1,18}$'
    and storage.filename(name) ~ '^[A-Za-z0-9._-]{1,255}$'
  );
