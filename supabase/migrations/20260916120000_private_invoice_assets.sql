-- Invoice signatures and branding are private CRM assets.
-- Clients receive short-lived signed URLs only for assets referenced by their
-- own invoice; public bucket URLs are not permitted.

update storage.buckets
set public = false
where id = 'invoice-signatures';

drop policy if exists "CRM admins can read invoice assets" on storage.objects;
create policy "CRM admins can read invoice assets"
  on storage.objects for select
  using (
    bucket_id = 'invoice-signatures'
    and public.is_company_admin()
  );

drop policy if exists "Clients can read linked invoice assets" on storage.objects;
create policy "Clients can read linked invoice assets"
  on storage.objects for select
  using (
    bucket_id = 'invoice-signatures'
    and public.get_user_role() = 'client'
    and exists (
      select 1
      from public.crm_invoices invoice
      where invoice.client_id = public.get_user_client_id()
        and (
          invoice.sign_url = name
          or invoice.invoice_branding->>'logo_path' = name
          or invoice.invoice_branding->>'qr_path' = name
          or invoice.invoice_branding->>'signature_path' = name
        )
    )
  );
