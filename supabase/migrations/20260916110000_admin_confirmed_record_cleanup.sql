-- Admin-only, auditable cleanup for explicitly confirmed client/ticket records.
-- The function deliberately rejects arbitrary table names and profile deletion.

create or replace function public.purge_confirmed_crm_records(p_records jsonb, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  record jsonb;
  resource_name text;
  record_id bigint;
  affected_rows integer;
  deleted_count integer := 0;
begin
  if not public.is_company_admin() then
    raise exception using errcode = '42501', message = 'Only company admins can remove confirmed records.';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception using errcode = '22023', message = 'A cleanup reason is required.';
  end if;
  if jsonb_typeof(coalesce(p_records, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'Cleanup records must be an array.';
  end if;

  for record in select value from jsonb_array_elements(p_records) loop
    resource_name := record->>'resource';
    if resource_name not in ('clients', 'tickets') or coalesce(record->>'id', '') !~ '^[0-9]+$' then
      raise exception using errcode = '22023', message = 'Only valid client or ticket records can be removed.';
    end if;
    record_id := (record->>'id')::bigint;
    if record_id < 1 then
      raise exception using errcode = '22023', message = 'Only valid client or ticket records can be removed.';
    end if;

    if resource_name = 'clients' then
      delete from public.crm_clients where id = record_id;
    else
      delete from public.crm_tickets where id = record_id;
    end if;
    get diagnostics affected_rows = row_count;
    deleted_count := deleted_count + affected_rows;
  end loop;

  insert into public.crm_activities (action, entity_type, entity_id, summary, user_id)
  values (
    'confirmed_record_cleanup',
    'crm_cleanup',
    deleted_count,
    left(trim(p_reason), 500),
    auth.uid()
  );

  return jsonb_build_object('deleted_count', deleted_count);
end;
$$;

revoke all on function public.purge_confirmed_crm_records(jsonb, text) from public;
grant execute on function public.purge_confirmed_crm_records(jsonb, text) to authenticated;
