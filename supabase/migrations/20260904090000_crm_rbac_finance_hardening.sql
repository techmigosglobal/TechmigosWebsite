-- TechMigos CRM: hosted parity, read-only employee RBAC, and finance hardening.
-- This migration changes schema/policies/functions only. It does not rewrite
-- existing CRM business rows.

alter table public.crm_invoices
  add column if not exists project_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists invoice_branding jsonb not null default '{}'::jsonb,
  add column if not exists is_recurring boolean not null default false;

create or replace function public.get_user_role()
returns text
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role from public.crm_profiles where auth_user_id = auth.uid() limit 1),
    'anon'
  );
$$;

create or replace function public.is_company_staff()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select public.get_user_role() in ('company_admin', 'company_member');
$$;

create or replace function public.is_company_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select public.get_user_role() = 'company_admin';
$$;

create or replace function public.get_user_client_id()
returns bigint
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select (
    select client_id
    from public.crm_profiles
    where auth_user_id = auth.uid()
    limit 1
  );
$$;

-- Username login is intentionally limited to the email address needed by
-- Supabase Auth. The caller still has to complete password authentication and
-- receive an active CRM profile.
create or replace function public.get_email_by_username(p_username text)
returns text
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select lower(trim(email))
  from public.crm_profiles
  where lower(trim(name)) = lower(trim(p_username))
    and status = 'active'
  order by id
  limit 1;
$$;

create or replace function public.record_crm_last_login()
returns void
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
begin
  update public.crm_profiles
  set last_login = now()::text
  where auth_user_id = auth.uid();
end;
$$;

grant execute on function public.get_email_by_username(text) to anon, authenticated;
grant execute on function public.record_crm_last_login() to authenticated;
grant execute on function public.get_user_role() to authenticated;
grant execute on function public.is_company_staff() to authenticated;
grant execute on function public.is_company_admin() to authenticated;
grant execute on function public.get_user_client_id() to authenticated;

-- Profiles are administrator-managed. Users may read only their own profile;
-- there is deliberately no self-update policy because role/status/client
-- linkage must not be browser-editable.
drop policy if exists "Company staff can read all profiles" on public.crm_profiles;
drop policy if exists "Company admins can read all profiles" on public.crm_profiles;
drop policy if exists "Users can read own profile" on public.crm_profiles;
drop policy if exists "Company admins can insert profiles" on public.crm_profiles;
drop policy if exists "Company admins can update profiles" on public.crm_profiles;
drop policy if exists "Users can update own profile" on public.crm_profiles;
drop policy if exists "Company admins can delete profiles" on public.crm_profiles;

create policy "CRM admins can read profiles"
  on public.crm_profiles for select
  using (public.is_company_admin() or auth.uid() = auth_user_id);

create policy "CRM admins can insert profiles"
  on public.crm_profiles for insert
  with check (public.is_company_admin());

create policy "CRM admins can update profiles"
  on public.crm_profiles for update
  using (public.is_company_admin())
  with check (public.is_company_admin());

create policy "CRM admins can delete profiles"
  on public.crm_profiles for delete
  using (public.is_company_admin());

-- Remove broad company-member mutations from every enabled operational table.
-- Admins retain CRUD; employees have company-wide read-only access.
do $$
declare
  table_name text;
  resource_tables text[] := array[
    'crm_clients', 'crm_projects', 'crm_tickets', 'crm_ticket_messages',
    'crm_invoices', 'crm_invoice_items', 'crm_finances', 'crm_activities'
  ];
begin
  foreach table_name in array resource_tables loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

-- Clients
drop policy if exists "Company staff can manage clients" on public.crm_clients;
drop policy if exists "CRM admins can manage clients" on public.crm_clients;
drop policy if exists "CRM employees can read clients" on public.crm_clients;
drop policy if exists "Clients can read own record" on public.crm_clients;

create policy "CRM admins can manage clients"
  on public.crm_clients for all
  using (public.is_company_admin())
  with check (public.is_company_admin());

create policy "CRM employees can read clients"
  on public.crm_clients for select
  using (public.get_user_role() = 'company_member');

create policy "Clients can read own record"
  on public.crm_clients for select
  using (id = public.get_user_client_id());

-- Projects
drop policy if exists "Company staff can manage projects" on public.crm_projects;
drop policy if exists "CRM admins can manage projects" on public.crm_projects;
drop policy if exists "CRM employees can read projects" on public.crm_projects;
drop policy if exists "Clients can read own projects" on public.crm_projects;

create policy "CRM admins can manage projects"
  on public.crm_projects for all
  using (public.is_company_admin())
  with check (public.is_company_admin());

create policy "CRM employees can read projects"
  on public.crm_projects for select
  using (public.get_user_role() = 'company_member');

create policy "Clients can read own projects"
  on public.crm_projects for select
  using (client_id = public.get_user_client_id());

-- Tickets: clients can create tickets, but only staff/admins can mutate them.
drop policy if exists "Company staff can manage tickets" on public.crm_tickets;
drop policy if exists "CRM admins can manage tickets" on public.crm_tickets;
drop policy if exists "CRM employees can read tickets" on public.crm_tickets;
drop policy if exists "Clients can read own tickets" on public.crm_tickets;
drop policy if exists "Clients can insert own tickets" on public.crm_tickets;
drop policy if exists "Clients can update own tickets" on public.crm_tickets;

create policy "CRM admins can manage tickets"
  on public.crm_tickets for all
  using (public.is_company_admin())
  with check (public.is_company_admin());

create policy "CRM employees can read tickets"
  on public.crm_tickets for select
  using (public.get_user_role() = 'company_member');

create policy "Clients can read own tickets"
  on public.crm_tickets for select
  using (client_id = public.get_user_client_id());

create policy "Clients can insert own tickets"
  on public.crm_tickets for insert
  with check (client_id = public.get_user_client_id());

-- Ticket messages are readable to staff and externally visible linked clients.
drop policy if exists "Company staff can manage ticket messages" on public.crm_ticket_messages;
drop policy if exists "CRM admins can manage ticket messages" on public.crm_ticket_messages;
drop policy if exists "CRM employees can read ticket messages" on public.crm_ticket_messages;
drop policy if exists "Clients can read own ticket messages" on public.crm_ticket_messages;
drop policy if exists "Clients can insert own ticket messages" on public.crm_ticket_messages;

create policy "CRM admins can manage ticket messages"
  on public.crm_ticket_messages for all
  using (public.is_company_admin())
  with check (public.is_company_admin());

create policy "CRM employees can read ticket messages"
  on public.crm_ticket_messages for select
  using (public.get_user_role() = 'company_member');

create policy "Clients can read own ticket messages"
  on public.crm_ticket_messages for select
  using (
    visibility = 'external'
    and ticket_id in (
      select id from public.crm_tickets where client_id = public.get_user_client_id()
    )
  );

create policy "Clients can insert own ticket messages"
  on public.crm_ticket_messages for insert
  with check (
    visibility = 'external'
    and ticket_id in (
      select id from public.crm_tickets where client_id = public.get_user_client_id()
    )
  );

-- Invoices and items: only Admins can mutate; staff can read; clients read
-- only their own invoice graph.
drop policy if exists "Company staff can manage invoices" on public.crm_invoices;
drop policy if exists "CRM admins can manage invoices" on public.crm_invoices;
drop policy if exists "CRM employees can read invoices" on public.crm_invoices;
drop policy if exists "Clients can read own invoices" on public.crm_invoices;

create policy "CRM admins can manage invoices"
  on public.crm_invoices for all
  using (public.is_company_admin())
  with check (public.is_company_admin());

create policy "CRM employees can read invoices"
  on public.crm_invoices for select
  using (public.get_user_role() = 'company_member');

create policy "Clients can read own invoices"
  on public.crm_invoices for select
  using (client_id = public.get_user_client_id());

drop policy if exists "Company staff can manage invoice items" on public.crm_invoice_items;
drop policy if exists "CRM admins can manage invoice items" on public.crm_invoice_items;
drop policy if exists "CRM employees can read invoice items" on public.crm_invoice_items;
drop policy if exists "Clients can read own invoice items" on public.crm_invoice_items;

create policy "CRM admins can manage invoice items"
  on public.crm_invoice_items for all
  using (public.is_company_admin())
  with check (public.is_company_admin());

create policy "CRM employees can read invoice items"
  on public.crm_invoice_items for select
  using (public.get_user_role() = 'company_member');

create policy "Clients can read own invoice items"
  on public.crm_invoice_items for select
  using (
    invoice_id in (
      select id from public.crm_invoices where client_id = public.get_user_client_id()
    )
  );

-- Finance is staff-readable but Admin-writeable. Clients have no policy.
drop policy if exists "Company staff can manage finances" on public.crm_finances;
drop policy if exists "CRM admins can manage finances" on public.crm_finances;
drop policy if exists "CRM employees can read finances" on public.crm_finances;

create policy "CRM admins can manage finances"
  on public.crm_finances for all
  using (public.is_company_admin())
  with check (public.is_company_admin());

create policy "CRM employees can read finances"
  on public.crm_finances for select
  using (public.get_user_role() = 'company_member');

-- Activity history is read-only for employees and Admin-managed for writes.
drop policy if exists "Company staff can read activities" on public.crm_activities;
drop policy if exists "Authenticated users can insert activities" on public.crm_activities;
drop policy if exists "CRM admins can read activities" on public.crm_activities;
drop policy if exists "CRM employees can read activities" on public.crm_activities;
drop policy if exists "CRM admins can insert activities" on public.crm_activities;

create policy "CRM admins can read activities"
  on public.crm_activities for select
  using (public.is_company_admin());

create policy "CRM employees can read activities"
  on public.crm_activities for select
  using (public.get_user_role() = 'company_member');

create policy "CRM admins can insert activities"
  on public.crm_activities for insert
  with check (public.is_company_admin() and user_id = auth.uid());

-- Settings are already Admin-only in the reviewed migration; recreate the
-- policy here so a remote database with only the first five migrations also
-- receives the restriction.
drop policy if exists "Company staff can manage settings" on public.crm_settings;
drop policy if exists "Company admins can manage settings" on public.crm_settings;
drop policy if exists "CRM admins can manage settings" on public.crm_settings;

create policy "CRM admins can manage settings"
  on public.crm_settings for all
  using (public.is_company_admin())
  with check (public.is_company_admin());

-- Storage: finance proofs remain private. Employees can preview/download;
-- only Admins can create, replace, or delete proof objects.
drop policy if exists "Company staff can upload finance proofs" on storage.objects;
drop policy if exists "Company staff can read finance proofs" on storage.objects;
drop policy if exists "Company staff can update finance proofs" on storage.objects;
drop policy if exists "Company staff can delete finance proofs" on storage.objects;

create policy "CRM admins can upload finance proofs"
  on storage.objects for insert
  with check (bucket_id = 'finance-proofs' and public.is_company_admin());

create policy "CRM staff can read finance proofs"
  on storage.objects for select
  using (bucket_id = 'finance-proofs' and public.is_company_staff());

create policy "CRM admins can update finance proofs"
  on storage.objects for update
  using (bucket_id = 'finance-proofs' and public.is_company_admin())
  with check (bucket_id = 'finance-proofs' and public.is_company_admin());

create policy "CRM admins can delete finance proofs"
  on storage.objects for delete
  using (bucket_id = 'finance-proofs' and public.is_company_admin());

-- Invoice assets are intentionally public-read for customer-facing print/PDF
-- output, while writes remain Admin-only.
insert into storage.buckets (id, name, public)
values ('invoice-signatures', 'invoice-signatures', true)
on conflict (id) do update set public = true;

drop policy if exists "CRM admins can upload invoice assets" on storage.objects;
drop policy if exists "CRM admins can update invoice assets" on storage.objects;
drop policy if exists "CRM admins can delete invoice assets" on storage.objects;

create policy "CRM admins can upload invoice assets"
  on storage.objects for insert
  with check (bucket_id = 'invoice-signatures' and public.is_company_admin());

create policy "CRM admins can update invoice assets"
  on storage.objects for update
  using (bucket_id = 'invoice-signatures' and public.is_company_admin())
  with check (bucket_id = 'invoice-signatures' and public.is_company_admin());

create policy "CRM admins can delete invoice assets"
  on storage.objects for delete
  using (bucket_id = 'invoice-signatures' and public.is_company_admin());

-- Atomic invoice and item persistence. RLS remains active because this is an
-- invoker function, and the Admin policy is the authority for writes.
create or replace function public.save_invoice_with_items(
  p_invoice jsonb,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
volatile
set search_path = public, pg_temp
as $$
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
  if not public.is_company_admin() then
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
$$;

grant execute on function public.save_invoice_with_items(jsonb, jsonb) to authenticated;
