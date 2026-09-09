-- Keep operational CRM references relational. Names remain denormalized only
-- for readable exports and legacy records; IDs are the source of truth.

alter table public.crm_finances
  add column if not exists client_id bigint references public.crm_clients(id) on delete set null,
  add column if not exists project_id bigint references public.crm_projects(id) on delete set null;

create index if not exists crm_finances_client_id_idx on public.crm_finances (client_id);
create index if not exists crm_finances_project_id_idx on public.crm_finances (project_id);

create or replace function public.sync_project_client_reference()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  linked_client public.crm_clients;
begin
  if new.client_id is null then
    new.client_name := '';
    return new;
  end if;

  select * into linked_client from public.crm_clients where id = new.client_id;
  if not found then
    raise exception using errcode = '23503', message = 'The selected client no longer exists.';
  end if;
  new.client_name := coalesce(nullif(linked_client.company, ''), linked_client.name, '');
  return new;
end;
$$;

drop trigger if exists crm_projects_sync_client_reference on public.crm_projects;
create trigger crm_projects_sync_client_reference
before insert or update of client_id on public.crm_projects
for each row execute function public.sync_project_client_reference();

-- Correct display names only where a real foreign-key relationship already
-- exists. No record is guessed, deleted, or linked by text matching.
update public.crm_projects project
set client_name = coalesce(nullif(client.company, ''), client.name, '')
from public.crm_clients client
where project.client_id = client.id
  and project.client_name is distinct from coalesce(nullif(client.company, ''), client.name, '');

create or replace function public.sync_finance_references()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  linked_client public.crm_clients;
  linked_project public.crm_projects;
begin
  if new.project_id is not null then
    select * into linked_project from public.crm_projects where id = new.project_id;
    if not found then
      raise exception using errcode = '23503', message = 'The selected project no longer exists.';
    end if;
    if new.client_id is not null and linked_project.client_id is not null and new.client_id <> linked_project.client_id then
      raise exception using errcode = '23514', message = 'The selected project belongs to a different client.';
    end if;
    if new.client_id is null then new.client_id := linked_project.client_id; end if;
    new.project := linked_project.name;
  elsif new.project_id is null then
    new.project := '';
  end if;

  if new.client_id is not null then
    select * into linked_client from public.crm_clients where id = new.client_id;
    if not found then
      raise exception using errcode = '23503', message = 'The selected client no longer exists.';
    end if;
    new.client := coalesce(nullif(linked_client.company, ''), linked_client.name, '');
  elsif new.client_id is null then
    new.client := '';
  end if;
  return new;
end;
$$;

drop trigger if exists crm_finances_sync_references on public.crm_finances;
create trigger crm_finances_sync_references
before insert or update of client_id, project_id on public.crm_finances
for each row execute function public.sync_finance_references();

-- An invoice may only use a project belonging to the same client. This keeps
-- project, client, invoice, and finance views in agreement.
create or replace function public.enforce_invoice_project_client_match()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  linked_project public.crm_projects;
begin
  if new.project_id is null then return new; end if;
  select * into linked_project from public.crm_projects where id = new.project_id;
  if not found then
    raise exception using errcode = '23503', message = 'The selected project no longer exists.';
  end if;
  if linked_project.client_id is not null and new.client_id <> linked_project.client_id then
    raise exception using errcode = '23514', message = 'The selected project belongs to a different client.';
  end if;
  return new;
end;
$$;

drop trigger if exists crm_invoices_project_client_match on public.crm_invoices;
create trigger crm_invoices_project_client_match
before insert or update of client_id, project_id on public.crm_invoices
for each row execute function public.enforce_invoice_project_client_match();
