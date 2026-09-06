-- Remove the derived invoice ledger entry when its generated invoice is
-- deleted. Other finance rows, including separately recorded payments, keep
-- their invoice_id set-null history.

create or replace function public.remove_invoice_income_ledger()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  delete from public.crm_finances
  where invoice_id = old.id
    and transaction_type = 'invoice';
  return old;
end;
$$;

drop trigger if exists remove_invoice_income_ledger on public.crm_invoices;
create trigger remove_invoice_income_ledger
  before delete on public.crm_invoices
  for each row execute function public.remove_invoice_income_ledger();

revoke all on function public.remove_invoice_income_ledger() from public;
grant execute on function public.remove_invoice_income_ledger() to authenticated;
