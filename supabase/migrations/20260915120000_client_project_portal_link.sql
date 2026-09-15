-- Keep client portal visibility tied to an explicit client relationship.
-- Older databases created crm_profiles.client_id without a foreign key.  Keep
-- legacy rows intact while enforcing valid links for every new or changed row.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.crm_profiles'::regclass
      and conname = 'crm_profiles_client_id_fkey'
  ) then
    alter table public.crm_profiles
      add constraint crm_profiles_client_id_fkey
      foreign key (client_id)
      references public.crm_clients(id)
      on delete set null
      not valid;
  end if;
end;
$$;

create or replace function public.enforce_crm_profile_client_link()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.role = 'client' then
    if new.client_id is null then
      raise exception using errcode = '23514', message = 'Client users must be linked to a CRM client.';
    end if;
    if not exists (select 1 from public.crm_clients where id = new.client_id) then
      raise exception using errcode = '23503', message = 'The selected CRM client does not exist.';
    end if;
  else
    new.client_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists crm_profiles_enforce_client_link on public.crm_profiles;
create trigger crm_profiles_enforce_client_link
before insert or update of role, client_id on public.crm_profiles
for each row execute function public.enforce_crm_profile_client_link();

create index if not exists crm_profiles_client_id_idx
  on public.crm_profiles (client_id)
  where client_id is not null;
