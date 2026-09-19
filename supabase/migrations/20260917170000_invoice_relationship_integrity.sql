-- Keep invoices linked to the same client as their optional project.

create or replace function public.validate_invoice_project_client()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  project_client_id bigint;
begin
  if new.project_id is null then
    return new;
  end if;

  select client_id
    into project_client_id
  from public.crm_projects
  where id = new.project_id;

  if project_client_id is null or new.client_id is null or project_client_id <> new.client_id then
    raise exception using errcode = '23514', message = 'The invoice project must belong to the selected client.';
  end if;
  return new;
end;
$$;

drop trigger if exists crm_invoices_project_client_integrity on public.crm_invoices;
create trigger crm_invoices_project_client_integrity
before insert or update of client_id, project_id on public.crm_invoices
for each row execute function public.validate_invoice_project_client();
