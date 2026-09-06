-- Keep generated invoice documents separate from the finance ledger while
-- automatically representing each active invoice as invoice income.

create unique index if not exists idx_crm_finances_invoice_ledger_entry
  on public.crm_finances(invoice_id)
  where invoice_id is not null and transaction_type = 'invoice';

create or replace function public.sync_invoice_income_ledger()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  insert into public.crm_finances (
    invoice_id,
    transaction_date,
    transaction_type,
    reference_id,
    title,
    client,
    project,
    amount,
    status,
    notes,
    source
  ) values (
    new.id,
    coalesce(new.invoice_date, current_date),
    'invoice',
    coalesce(new.invoice_number, ''),
    coalesce(nullif(new.service_title, ''), 'Invoice ' || coalesce(new.invoice_number, new.id::text)),
    coalesce(new.customer_name, ''),
    coalesce(new.service_title, ''),
    greatest(coalesce(new.total_amount, 0), 0),
    case when lower(coalesce(new.status, '')) = 'cancelled' then 'cancelled' else 'pending' end,
    'Automatically linked to generated invoice ' || coalesce(new.invoice_number, new.id::text),
    'invoice'
  )
  on conflict (invoice_id) where transaction_type = 'invoice'
  do update set
    transaction_date = excluded.transaction_date,
    reference_id = excluded.reference_id,
    title = excluded.title,
    client = excluded.client,
    project = excluded.project,
    amount = excluded.amount,
    status = excluded.status,
    notes = excluded.notes,
    source = excluded.source;

  return new;
end;
$$;

drop trigger if exists sync_invoice_income_ledger on public.crm_invoices;
create trigger sync_invoice_income_ledger
  after insert or update on public.crm_invoices
  for each row execute function public.sync_invoice_income_ledger();

revoke all on function public.sync_invoice_income_ledger() from public;
grant execute on function public.sync_invoice_income_ledger() to authenticated;
