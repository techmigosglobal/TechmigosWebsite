-- Add received_amount to invoices for tracking partial payments
alter table crm_invoices add column if not exists received_amount numeric(12,2) not null default 0;
