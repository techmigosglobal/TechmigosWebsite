-- Pending/draft/sent invoices remain outstanding. Only paid generated
-- invoices are settled income ledger entries.

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
    case
      when lower(coalesce(new.status, '')) = 'cancelled' then 'cancelled'
      when lower(coalesce(new.status, '')) = 'paid' then 'received'
      else 'pending'
    end,
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
