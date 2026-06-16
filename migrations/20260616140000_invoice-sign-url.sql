-- Add signature image URL to invoices
alter table crm_invoices add column if not exists sign_url text;
