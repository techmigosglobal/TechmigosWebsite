-- The invoice ledger function is invoked by its trigger, not by anonymous
-- callers. Remove explicit/default anonymous EXECUTE while retaining the
-- authenticated grant established by the original function migration.
revoke all on function public.sync_invoice_income_ledger() from public, anon;
grant execute on function public.sync_invoice_income_ledger() to authenticated;
