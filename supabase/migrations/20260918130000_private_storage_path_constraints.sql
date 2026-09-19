-- Keep private finance proofs and invoice assets inside the paths, MIME types,
-- and size limits promised by the repository. This closes the direct Storage
-- API path in addition to the browser-side validation.

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
where id = 'finance-proofs';

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'invoice-signatures';

drop policy if exists "CRM admins can upload finance proofs" on storage.objects;
create policy "CRM admins can upload finance proofs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'finance-proofs'
    and (select private.is_company_admin())
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and (storage.foldername(name))[1] = 'records'
    and (storage.foldername(name))[2] ~ '^[0-9]{1,18}$'
    and storage.filename(name) ~ '^[A-Za-z0-9._-]{1,255}$'
    and coalesce((metadata ->> 'size')::bigint, 0) between 0 and 10485760
    and coalesce(metadata ->> 'mimetype', '') = any (array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
  );

drop policy if exists "CRM staff can read finance proofs" on storage.objects;
create policy "CRM staff can read finance proofs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'finance-proofs'
    and (select private.is_company_staff())
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and (storage.foldername(name))[1] = 'records'
    and (storage.foldername(name))[2] ~ '^[0-9]{1,18}$'
    and storage.filename(name) ~ '^[A-Za-z0-9._-]{1,255}$'
  );

drop policy if exists "CRM admins can update finance proofs" on storage.objects;
create policy "CRM admins can update finance proofs"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'finance-proofs'
    and (select private.is_company_admin())
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and (storage.foldername(name))[1] = 'records'
    and (storage.foldername(name))[2] ~ '^[0-9]{1,18}$'
    and storage.filename(name) ~ '^[A-Za-z0-9._-]{1,255}$'
  )
  with check (
    bucket_id = 'finance-proofs'
    and (select private.is_company_admin())
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and (storage.foldername(name))[1] = 'records'
    and (storage.foldername(name))[2] ~ '^[0-9]{1,18}$'
    and storage.filename(name) ~ '^[A-Za-z0-9._-]{1,255}$'
    and coalesce((metadata ->> 'size')::bigint, 0) between 0 and 10485760
    and coalesce(metadata ->> 'mimetype', '') = any (array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
  );

drop policy if exists "CRM admins can delete finance proofs" on storage.objects;
create policy "CRM admins can delete finance proofs"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'finance-proofs'
    and (select private.is_company_admin())
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and (storage.foldername(name))[1] = 'records'
    and (storage.foldername(name))[2] ~ '^[0-9]{1,18}$'
    and storage.filename(name) ~ '^[A-Za-z0-9._-]{1,255}$'
  );

drop policy if exists "CRM admins can upload invoice assets" on storage.objects;
create policy "CRM admins can upload invoice assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'invoice-signatures'
    and (select private.is_company_admin())
    and (
      ((storage.foldername(name))[1] = 'invoice-assets' and (storage.foldername(name))[2] ~ '^[A-Za-z0-9._-]{1,100}$')
      or ((storage.foldername(name))[1] = 'signatures' and (storage.foldername(name))[2] ~ '^[0-9]{1,18}$')
    )
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and storage.filename(name) ~ '^[A-Za-z0-9._-]{1,255}$'
    and coalesce((metadata ->> 'size')::bigint, 0) between 0 and 10485760
    and coalesce(metadata ->> 'mimetype', '') = any (array['image/png', 'image/jpeg', 'image/webp'])
  );

drop policy if exists "CRM admins can read invoice assets" on storage.objects;
create policy "CRM admins can read invoice assets"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'invoice-signatures'
    and (select private.is_company_admin())
    and (
      ((storage.foldername(name))[1] = 'invoice-assets' and (storage.foldername(name))[2] ~ '^[A-Za-z0-9._-]{1,100}$')
      or ((storage.foldername(name))[1] = 'signatures' and (storage.foldername(name))[2] ~ '^[0-9]{1,18}$')
    )
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and storage.filename(name) ~ '^[A-Za-z0-9._-]{1,255}$'
  );

drop policy if exists "Clients can read linked invoice assets" on storage.objects;
create policy "Clients can read linked invoice assets"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'invoice-signatures'
    and (select private.get_user_role()) = 'client'
    and (
      ((storage.foldername(name))[1] = 'invoice-assets' and (storage.foldername(name))[2] ~ '^[A-Za-z0-9._-]{1,100}$')
      or ((storage.foldername(name))[1] = 'signatures' and (storage.foldername(name))[2] ~ '^[0-9]{1,18}$')
    )
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and storage.filename(name) ~ '^[A-Za-z0-9._-]{1,255}$'
    and exists (
      select 1
      from public.crm_invoices invoice
      where invoice.client_id = (select private.get_user_client_id())
        and (
          invoice.sign_url = name
          or invoice.invoice_branding->>'logo_path' = name
          or invoice.invoice_branding->>'qr_path' = name
          or invoice.invoice_branding->>'signature_path' = name
        )
    )
  );

drop policy if exists "CRM admins can update invoice assets" on storage.objects;
create policy "CRM admins can update invoice assets"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'invoice-signatures'
    and (select private.is_company_admin())
    and (
      ((storage.foldername(name))[1] = 'invoice-assets' and (storage.foldername(name))[2] ~ '^[A-Za-z0-9._-]{1,100}$')
      or ((storage.foldername(name))[1] = 'signatures' and (storage.foldername(name))[2] ~ '^[0-9]{1,18}$')
    )
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and storage.filename(name) ~ '^[A-Za-z0-9._-]{1,255}$'
  )
  with check (
    bucket_id = 'invoice-signatures'
    and (select private.is_company_admin())
    and (
      ((storage.foldername(name))[1] = 'invoice-assets' and (storage.foldername(name))[2] ~ '^[A-Za-z0-9._-]{1,100}$')
      or ((storage.foldername(name))[1] = 'signatures' and (storage.foldername(name))[2] ~ '^[0-9]{1,18}$')
    )
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and storage.filename(name) ~ '^[A-Za-z0-9._-]{1,255}$'
    and coalesce((metadata ->> 'size')::bigint, 0) between 0 and 10485760
    and coalesce(metadata ->> 'mimetype', '') = any (array['image/png', 'image/jpeg', 'image/webp'])
  );

drop policy if exists "CRM admins can delete invoice assets" on storage.objects;
create policy "CRM admins can delete invoice assets"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'invoice-signatures'
    and (select private.is_company_admin())
    and (
      ((storage.foldername(name))[1] = 'invoice-assets' and (storage.foldername(name))[2] ~ '^[A-Za-z0-9._-]{1,100}$')
      or ((storage.foldername(name))[1] = 'signatures' and (storage.foldername(name))[2] ~ '^[0-9]{1,18}$')
    )
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and storage.filename(name) ~ '^[A-Za-z0-9._-]{1,255}$'
  );
