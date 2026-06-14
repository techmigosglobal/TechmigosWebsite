alter table crm_invoices add column if not exists customer_name text;
alter table crm_invoices add column if not exists customer_company text;
alter table crm_invoices add column if not exists customer_email text;
alter table crm_invoices add column if not exists customer_phone text;
alter table crm_invoices add column if not exists billing_address text;
alter table crm_invoices add column if not exists print_date date;
alter table crm_invoices add column if not exists service_title text;
alter table crm_invoices add column if not exists reference_number text;
