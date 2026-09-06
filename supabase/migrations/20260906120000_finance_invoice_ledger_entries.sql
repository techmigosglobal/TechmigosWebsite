-- Keep invoice ledger entries in the Transactions workflow while retaining
-- generated invoice documents and line items in crm_invoices.
alter table public.crm_finances
  add column if not exists invoice_id bigint references public.crm_invoices(id) on delete set null;

alter table public.crm_finances
  drop constraint if exists crm_finances_transaction_type_check;

alter table public.crm_finances
  add constraint crm_finances_transaction_type_check
  check (transaction_type in ('income', 'expense', 'revenue', 'salary', 'invoice'));

create index if not exists idx_crm_finances_invoice_id
  on public.crm_finances(invoice_id);
