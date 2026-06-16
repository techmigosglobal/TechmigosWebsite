-- Add proof attachment fields to finance transactions
alter table crm_finance_transactions add column if not exists proof_url text;
alter table crm_finance_transactions add column if not exists proof_key text;
