-- Keep the invoice save RPC executable only by authenticated company admins.
-- Public compatibility helper EXECUTE was removed when policy helpers moved
-- to private.*, so this SECURITY INVOKER RPC must use the private admin helper.
create or replace function public.save_invoice_with_items(
  p_invoice jsonb,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $function$
declare
  v_invoice_id bigint;
  v_existing jsonb := coalesce(p_invoice, '{}'::jsonb);
  v_item jsonb;
  v_subtotal numeric := 0;
  v_discount numeric := greatest(coalesce((v_existing->>'discount_amount')::numeric, 0), 0);
  v_tax numeric := greatest(coalesce((v_existing->>'tax_amount')::numeric, 0), 0);
  v_total numeric := 0;
  v_received numeric := 0;
  v_status text := lower(coalesce(nullif(v_existing->>'status', ''), 'draft'));
begin
  if not private.is_company_admin() then
    raise exception using errcode = '42501', message = 'Only company admins can save invoices.';
  end if;

  if nullif(trim(v_existing->>'client_id'), '') is null then
    raise exception using errcode = '22023', message = 'A CRM client is required for every invoice.';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'Invoice items must be an array.';
  end if;

  select coalesce(sum(
    greatest(coalesce((item->>'quantity')::numeric, 1), 0)
    * greatest(coalesce((item->>'rate')::numeric, 0), 0)
  ), 0)
  into v_subtotal
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item;

  v_total := greatest(v_subtotal - v_discount + v_tax, 0);
  v_received := least(greatest(coalesce((v_existing->>'received_amount')::numeric, 0), 0), v_total);
  if v_status = 'paid' or (v_total > 0 and v_received >= v_total) then
    v_received := v_total;
    v_status := 'paid';
  end if;

  if nullif(trim(v_existing->>'id'), '') is not null then
    v_invoice_id := (v_existing->>'id')::bigint;
    update public.crm_invoices
    set client_id = (v_existing->>'client_id')::bigint,
        project_id = nullif(v_existing->>'project_id', '')::bigint,
        invoice_number = coalesce(nullif(trim(v_existing->>'invoice_number'), ''), invoice_number),
        invoice_date = coalesce(nullif(v_existing->>'invoice_date', '')::date, invoice_date),
        due_date = nullif(v_existing->>'due_date', '')::date,
        currency = coalesce(nullif(v_existing->>'currency', ''), 'INR'),
        customer_name = coalesce(v_existing->>'customer_name', ''),
        customer_email = coalesce(v_existing->>'customer_email', ''),
        customer_phone = coalesce(v_existing->>'customer_phone', ''),
        billing_address = coalesce(v_existing->>'billing_address', ''),
        service_title = coalesce(v_existing->>'service_title', ''),
        discount_amount = v_discount,
        tax_amount = v_tax,
        total_amount = v_total,
        received_amount = v_received,
        status = v_status,
        notes = coalesce(v_existing->>'notes', ''),
        payment_instructions = coalesce(v_existing->>'payment_instructions', ''),
        terms = coalesce(v_existing->>'terms', ''),
        sign_url = coalesce(v_existing->>'sign_url', ''),
        project_snapshot = case when jsonb_typeof(v_existing->'project_snapshot') = 'object' then v_existing->'project_snapshot' else project_snapshot end,
        invoice_branding = case when jsonb_typeof(v_existing->'invoice_branding') = 'object' then v_existing->'invoice_branding' else invoice_branding end,
        is_recurring = coalesce((v_existing->>'is_recurring')::boolean, false)
    where id = v_invoice_id;
    if not found then
      raise exception using errcode = 'P0002', message = 'Invoice not found.';
    end if;
  else
    insert into public.crm_invoices (
      client_id, project_id, invoice_number, invoice_date, due_date, currency,
      customer_name, customer_email, customer_phone, billing_address,
      service_title, discount_amount, tax_amount, total_amount, received_amount,
      status, notes, payment_instructions, terms, sign_url, project_snapshot,
      invoice_branding, is_recurring
    ) values (
      (v_existing->>'client_id')::bigint,
      nullif(v_existing->>'project_id', '')::bigint,
      nullif(trim(v_existing->>'invoice_number'), ''),
      coalesce(nullif(v_existing->>'invoice_date', '')::date, current_date),
      nullif(v_existing->>'due_date', '')::date,
      coalesce(nullif(v_existing->>'currency', ''), 'INR'),
      coalesce(v_existing->>'customer_name', ''),
      coalesce(v_existing->>'customer_email', ''),
      coalesce(v_existing->>'customer_phone', ''),
      coalesce(v_existing->>'billing_address', ''),
      coalesce(v_existing->>'service_title', ''),
      v_discount, v_tax, v_total, v_received, v_status,
      coalesce(v_existing->>'notes', ''),
      coalesce(v_existing->>'payment_instructions', ''),
      coalesce(v_existing->>'terms', ''),
      coalesce(v_existing->>'sign_url', ''),
      case when jsonb_typeof(v_existing->'project_snapshot') = 'object' then v_existing->'project_snapshot' else '{}'::jsonb end,
      case when jsonb_typeof(v_existing->'invoice_branding') = 'object' then v_existing->'invoice_branding' else '{}'::jsonb end,
      coalesce((v_existing->>'is_recurring')::boolean, false)
    ) returning id into v_invoice_id;
  end if;

  delete from public.crm_invoice_items where invoice_id = v_invoice_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if nullif(trim(v_item->>'description'), '') is null then
      raise exception using errcode = '22023', message = 'Every invoice item needs a description.';
    end if;
    if coalesce((v_item->>'quantity')::numeric, 1) < 0
       or coalesce((v_item->>'rate')::numeric, 0) < 0 then
      raise exception using errcode = '22023', message = 'Invoice quantity and rate cannot be negative.';
    end if;
    insert into public.crm_invoice_items (
      invoice_id, description, quantity, rate, amount, unit, notes, sort_order
    ) values (
      v_invoice_id,
      trim(v_item->>'description'),
      greatest(coalesce((v_item->>'quantity')::numeric, 1), 0),
      greatest(coalesce((v_item->>'rate')::numeric, 0), 0),
      greatest(coalesce((v_item->>'quantity')::numeric, 1), 0)
        * greatest(coalesce((v_item->>'rate')::numeric, 0), 0),
      coalesce(v_item->>'unit', ''),
      coalesce(v_item->>'notes', ''),
      coalesce((v_item->>'sort_order')::integer, 0)
    );
  end loop;

  return jsonb_build_object(
    'invoice', (select to_jsonb(i) from public.crm_invoices i where i.id = v_invoice_id),
    'items', coalesce((select jsonb_agg(to_jsonb(ii) order by ii.sort_order, ii.id) from public.crm_invoice_items ii where ii.invoice_id = v_invoice_id), '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.save_invoice_with_items(jsonb, jsonb) from public, anon;
grant execute on function public.save_invoice_with_items(jsonb, jsonb) to authenticated;
