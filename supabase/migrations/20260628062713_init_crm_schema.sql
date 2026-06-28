-- ============================================================
-- Techmigos CRM — Full Schema Migration
-- Tables: 18 | Auth: Supabase Auth | RLS: role-based
-- ============================================================

-- 0. Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE 1: crm_profiles — user accounts linked to auth.users
-- ============================================================
create table if not exists public.crm_profiles (
  id            bigserial primary key,
  auth_user_id  uuid unique references auth.users(id) on delete cascade,
  email         text not null,
  name          text not null default '',
  role          text not null default 'client' check (role in ('company_admin','company_member','client')),
  status        text not null default 'active' check (status in ('active','inactive','pending')),
  client_id     bigint,
  department    text default '',
  last_login    text default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE 2: crm_clients — client companies
-- ============================================================
create table if not exists public.crm_clients (
  id              bigserial primary key,
  name            text not null default '',
  company         text not null default '',
  email           text default '',
  phone           text default '',
  status          text not null default 'active' check (status in ('active','inactive','archived','lead')),
  marketing_opt_in boolean default false,
  notes           text default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- TABLE 3: crm_leads — sales leads
-- ============================================================
create table if not exists public.crm_leads (
  id            bigserial primary key,
  name          text not null default '',
  email         text default '',
  company       text default '',
  phone         text default '',
  service       text default '',
  budget        text default '',
  priority      text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status        text not null default 'new' check (status in ('new','contacted','qualified','proposal','won','lost')),
  assigned_to   text default '',
  message       text default '',
  source        text default '',
  source_path   text default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE 4: crm_projects — project management
-- ============================================================
create table if not exists public.crm_projects (
  id                bigserial primary key,
  client_id         bigint references public.crm_clients(id) on delete set null,
  name              text not null default '',
  client_name       text default '',
  project_manager   text default '',
  owner_user_id     uuid,
  budget            numeric not null default 0,
  expenses          numeric not null default 0,
  revenue           numeric not null default 0,
  status            text not null default 'planning' check (status in ('planning','active','review','completed','on_hold','cancelled')),
  health            text not null default 'on_track' check (health in ('on_track','watch','at_risk','breached')),
  progress          integer not null default 0 check (progress >= 0 and progress <= 100),
  due_date          date,
  summary           text default '',
  notes             text default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- TABLE 5: crm_deals — sales pipeline
-- ============================================================
create table if not exists public.crm_deals (
  id                  bigserial primary key,
  client_id           bigint references public.crm_clients(id) on delete set null,
  lead_id             bigint references public.crm_leads(id) on delete set null,
  title               text not null default '',
  stage               text not null default 'proposal' check (stage in ('proposal','negotiation','won','lost','planning')),
  value               numeric not null default 0,
  currency            text not null default 'INR',
  expected_close_date date,
  assigned_to         text default '',
  notes               text default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- TABLE 6: crm_tickets — support tickets
-- ============================================================
create table if not exists public.crm_tickets (
  id            bigserial primary key,
  client_id     bigint references public.crm_clients(id) on delete set null,
  project_id    bigint references public.crm_projects(id) on delete set null,
  subject       text not null default '',
  description   text default '',
  priority      text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status        text not null default 'open' check (status in ('open','in_progress','waiting','resolved','closed')),
  assigned_to   text default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE 7: crm_ticket_messages — ticket conversations
-- ============================================================
create table if not exists public.crm_ticket_messages (
  id            bigserial primary key,
  ticket_id     bigint not null references public.crm_tickets(id) on delete cascade,
  body          text not null default '',
  author_name   text default '',
  author_role   text default 'client',
  visibility    text not null default 'external' check (visibility in ('internal','external')),
  created_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE 8: crm_invoices — billing
-- ============================================================
create table if not exists public.crm_invoices (
  id                      bigserial primary key,
  client_id               bigint references public.crm_clients(id) on delete set null,
  project_id              bigint references public.crm_projects(id) on delete set null,
  invoice_number          text unique,
  invoice_date            date not null default current_date,
  due_date                date,
  currency                text not null default 'INR',
  customer_name           text default '',
  customer_email          text default '',
  customer_phone          text default '',
  billing_address         text default '',
  service_title           text default '',
  discount_amount         numeric not null default 0,
  tax_amount              numeric not null default 0,
  total_amount            numeric not null default 0,
  received_amount         numeric not null default 0,
  status                  text not null default 'draft' check (status in ('draft','sent','paid','overdue','cancelled')),
  notes                   text default '',
  payment_instructions    text default '',
  terms                   text default '',
  sign_url                text default '',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ============================================================
-- TABLE 9: crm_invoice_items — invoice line items
-- ============================================================
create table if not exists public.crm_invoice_items (
  id            bigserial primary key,
  invoice_id    bigint not null references public.crm_invoices(id) on delete cascade,
  description   text not null default '',
  quantity      numeric not null default 1,
  rate          numeric not null default 0,
  amount        numeric not null default 0,
  unit          text default '',
  notes         text default '',
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE 10: crm_finances — financial transactions
-- ============================================================
create table if not exists public.crm_finances (
  id                bigserial primary key,
  transaction_date  date not null default current_date,
  transaction_type  text not null default 'expense' check (transaction_type in ('income','expense','revenue','salary')),
  reference_id      text default '',
  title             text default '',
  client            text default '',
  project           text default '',
  paid_by           text default '',
  received_by       text default '',
  payment_method    text default '',
  department        text default '',
  amount            numeric not null default 0,
  status            text not null default 'pending' check (status in ('pending','paid','received','half_payment','cancelled')),
  notes             text default '',
  source            text default 'manual',
  proof_url         text default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- TABLE 11: crm_followups — task/follow-up tracking
-- ============================================================
create table if not exists public.crm_followups (
  id            bigserial primary key,
  related_type  text default '',
  related_id    bigint,
  title         text not null default '',
  due_at        date,
  status        text not null default 'pending' check (status in ('pending','scheduled','completed','cancelled')),
  assigned_to   text default '',
  notes         text default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE 12: crm_campaigns — marketing campaigns
-- ============================================================
create table if not exists public.crm_campaigns (
  id                  bigserial primary key,
  name                text not null default '',
  subject             text default '',
  body                text default '',
  status              text not null default 'draft' check (status in ('draft','scheduled','sent','cancelled')),
  msg91_template_id   text default '',
  scheduled_at        timestamptz,
  sent_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- TABLE 13: crm_activities — audit log
-- ============================================================
create table if not exists public.crm_activities (
  id            bigserial primary key,
  action        text not null default '',
  entity_type   text default '',
  entity_id     bigint,
  summary       text default '',
  user_id       uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE 14: crm_settings — company & invoice settings (key-value)
-- ============================================================
create table if not exists public.crm_settings (
  id            bigserial primary key,
  category      text not null default 'company' check (category in ('company','invoice')),
  settings      jsonb not null default '{}',
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE 15: contact_leads — public contact form submissions
-- ============================================================
create table if not exists public.contact_leads (
  id            bigserial primary key,
  name          text not null default '',
  email         text not null default '',
  company       text default '',
  phone         text default '',
  service       text default '',
  budget        text default '',
  message       text default '',
  source_path   text default '',
  status        text not null default 'new' check (status in ('new','contacted','qualified','closed')),
  notification_status text default 'pending',
  created_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE 16: newsletter_subscribers — newsletter signups
-- ============================================================
create table if not exists public.newsletter_subscribers (
  id            bigserial primary key,
  email         text not null unique,
  source_path   text default '',
  status        text not null default 'active' check (status in ('active','unsubscribed')),
  created_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE 17: career_applications — job applications
-- ============================================================
create table if not exists public.career_applications (
  id              bigserial primary key,
  job_title       text not null default '',
  name            text not null default '',
  email           text not null default '',
  linkedin        text default '',
  portfolio       text default '',
  cover_letter    text default '',
  resume_url      text default '',
  resume_path     text default '',
  company_website text default '',
  source_path     text default '',
  status          text not null default 'new' check (status in ('new','reviewing','shortlisted','interviewed','rejected','hired')),
  notification_status text default 'pending',
  created_at      timestamptz not null default now()
);

-- ============================================================
-- TABLE 18: todos — placeholder for Supabase demo
-- ============================================================
create table if not exists public.todos (
  id          bigserial primary key,
  name        text not null default '',
  is_complete boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- HELPER FUNCTIONS (created after tables exist)
-- ============================================================

-- Get current user's CRM role
create or replace function public.get_user_role()
returns text
language sql
security definer
stable
as $$
  select coalesce(
    (select role from public.crm_profiles where auth_user_id = auth.uid() limit 1),
    'anon'
  );
$$;

-- Check if current user is company staff
create or replace function public.is_company_staff()
returns boolean
language sql
security definer
stable
as $$
  select public.get_user_role() in ('company_admin', 'company_member');
$$;

-- Get current user's client_id
create or replace function public.get_user_client_id()
returns bigint
language sql
security definer
stable
as $$
  select (select client_id from public.crm_profiles where auth_user_id = auth.uid() limit 1);
$$;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- crm_profiles
alter table public.crm_profiles enable row level security;

create policy "Company staff can read all profiles"
  on public.crm_profiles for select
  using (public.is_company_staff());

create policy "Users can read own profile"
  on public.crm_profiles for select
  using (auth.uid() = auth_user_id);

create policy "Company admins can insert profiles"
  on public.crm_profiles for insert
  with check (public.get_user_role() = 'company_admin');

create policy "Company admins can update profiles"
  on public.crm_profiles for update
  using (public.get_user_role() = 'company_admin');

create policy "Users can update own profile"
  on public.crm_profiles for update
  using (auth.uid() = auth_user_id);

create policy "Company admins can delete profiles"
  on public.crm_profiles for delete
  using (public.get_user_role() = 'company_admin');

-- crm_clients
alter table public.crm_clients enable row level security;

create policy "Company staff can manage clients"
  on public.crm_clients for all
  using (public.is_company_staff());

create policy "Clients can read own record"
  on public.crm_clients for select
  using (id = public.get_user_client_id());

-- crm_leads
alter table public.crm_leads enable row level security;

create policy "Company staff can manage leads"
  on public.crm_leads for all
  using (public.is_company_staff());

create policy "Anyone can insert leads"
  on public.crm_leads for insert
  with check (true);

-- crm_projects
alter table public.crm_projects enable row level security;

create policy "Company staff can manage projects"
  on public.crm_projects for all
  using (public.is_company_staff());

create policy "Clients can read own projects"
  on public.crm_projects for select
  using (client_id = public.get_user_client_id());

-- crm_deals
alter table public.crm_deals enable row level security;

create policy "Company staff can manage deals"
  on public.crm_deals for all
  using (public.is_company_staff());

-- crm_tickets
alter table public.crm_tickets enable row level security;

create policy "Company staff can manage tickets"
  on public.crm_tickets for all
  using (public.is_company_staff());

create policy "Clients can read own tickets"
  on public.crm_tickets for select
  using (client_id = public.get_user_client_id());

create policy "Clients can insert own tickets"
  on public.crm_tickets for insert
  with check (client_id = public.get_user_client_id());

create policy "Clients can update own tickets"
  on public.crm_tickets for update
  using (client_id = public.get_user_client_id());

-- crm_ticket_messages
alter table public.crm_ticket_messages enable row level security;

create policy "Company staff can manage ticket messages"
  on public.crm_ticket_messages for all
  using (public.is_company_staff());

create policy "Clients can read own ticket messages"
  on public.crm_ticket_messages for select
  using (
    visibility = 'external' and
    ticket_id in (select id from public.crm_tickets where client_id = public.get_user_client_id())
  );

create policy "Clients can insert own ticket messages"
  on public.crm_ticket_messages for insert
  with check (
    visibility = 'external' and
    ticket_id in (select id from public.crm_tickets where client_id = public.get_user_client_id())
  );

-- crm_invoices
alter table public.crm_invoices enable row level security;

create policy "Company staff can manage invoices"
  on public.crm_invoices for all
  using (public.is_company_staff());

create policy "Clients can read own invoices"
  on public.crm_invoices for select
  using (client_id = public.get_user_client_id());

-- crm_invoice_items
alter table public.crm_invoice_items enable row level security;

create policy "Company staff can manage invoice items"
  on public.crm_invoice_items for all
  using (public.is_company_staff());

create policy "Clients can read own invoice items"
  on public.crm_invoice_items for select
  using (
    invoice_id in (
      select id from public.crm_invoices where client_id = public.get_user_client_id()
    )
  );

-- crm_finances
alter table public.crm_finances enable row level security;

create policy "Company staff can manage finances"
  on public.crm_finances for all
  using (public.is_company_staff());

-- crm_followups
alter table public.crm_followups enable row level security;

create policy "Company staff can manage followups"
  on public.crm_followups for all
  using (public.is_company_staff());

-- crm_campaigns
alter table public.crm_campaigns enable row level security;

create policy "Company staff can manage campaigns"
  on public.crm_campaigns for all
  using (public.is_company_staff());

-- crm_activities
alter table public.crm_activities enable row level security;

create policy "Company staff can read activities"
  on public.crm_activities for select
  using (public.is_company_staff());

create policy "Authenticated users can insert activities"
  on public.crm_activities for insert
  with check (auth.uid() is not null);

-- crm_settings
alter table public.crm_settings enable row level security;

create policy "Company staff can manage settings"
  on public.crm_settings for all
  using (public.is_company_staff());

-- Seed default settings
insert into public.crm_settings (category, settings) values
  ('company', '{"company_name":"TechMigos","company_email":"info@techmigos.com","company_phone":"+91 9959703547","timezone":"Asia/Kolkata","currency":"INR","company_address":"Hyderabad, Telangana, India"}'::jsonb),
  ('invoice', '{"prefix":"TMG","starting_number":1,"tax_label":"Tax","tax_rate":0,"default_terms":"","default_payment_instructions":""}'::jsonb);

-- contact_leads
alter table public.contact_leads enable row level security;

create policy "Anyone can insert contact leads"
  on public.contact_leads for insert
  with check (true);

create policy "Company staff can read contact leads"
  on public.contact_leads for select
  using (public.is_company_staff());

create policy "Company staff can update contact leads"
  on public.contact_leads for update
  using (public.is_company_staff());

-- newsletter_subscribers
alter table public.newsletter_subscribers enable row level security;

create policy "Anyone can subscribe"
  on public.newsletter_subscribers for insert
  with check (true);

create policy "Company staff can read subscribers"
  on public.newsletter_subscribers for select
  using (public.is_company_staff());

-- career_applications
alter table public.career_applications enable row level security;

create policy "Anyone can submit applications"
  on public.career_applications for insert
  with check (true);

create policy "Company staff can read applications"
  on public.career_applications for select
  using (public.is_company_staff());

create policy "Company staff can update applications"
  on public.career_applications for update
  using (public.is_company_staff());

-- todos
alter table public.todos enable row level security;

create policy "Anyone can read todos"
  on public.todos for select
  using (true);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('invoice-signatures', 'invoice-signatures', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('finance-proofs', 'finance-proofs', false)
on conflict (id) do nothing;

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_crm_profiles_auth_user on public.crm_profiles(auth_user_id);
create index if not exists idx_crm_profiles_email on public.crm_profiles(email);
create index if not exists idx_crm_profiles_role on public.crm_profiles(role);
create index if not exists idx_crm_clients_status on public.crm_clients(status);
create index if not exists idx_crm_leads_status on public.crm_leads(status);
create index if not exists idx_crm_projects_client on public.crm_projects(client_id);
create index if not exists idx_crm_projects_status on public.crm_projects(status);
create index if not exists idx_crm_tickets_client on public.crm_tickets(client_id);
create index if not exists idx_crm_tickets_status on public.crm_tickets(status);
create index if not exists idx_crm_ticket_messages_ticket on public.crm_ticket_messages(ticket_id);
create index if not exists idx_crm_invoices_client on public.crm_invoices(client_id);
create index if not exists idx_crm_invoices_number on public.crm_invoices(invoice_number);
create index if not exists idx_crm_invoice_items_invoice on public.crm_invoice_items(invoice_id);
create index if not exists idx_crm_finances_type on public.crm_finances(transaction_type);
create index if not exists idx_crm_finances_status on public.crm_finances(status);
create index if not exists idx_crm_activities_entity on public.crm_activities(entity_type, entity_id);
create index if not exists idx_contact_leads_email on public.contact_leads(email);
create index if not exists idx_career_applications_email on public.career_applications(email);

-- ============================================================
-- AUTO-UPDATE updated_at TIMESTAMPS
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'crm_profiles','crm_clients','crm_leads','crm_projects','crm_deals',
    'crm_tickets','crm_invoices','crm_finances','crm_followups','crm_campaigns'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.handle_updated_at()',
      t
    );
  end loop;
end;
$$;

-- ============================================================
-- AUTO-GENERATE INVOICE NUMBERS
-- ============================================================
create or replace function public.generate_invoice_number()
returns trigger
language plpgsql
as $$
declare
  prefix text;
  next_num int;
begin
  if new.invoice_number is not null and new.invoice_number != '' then
    return new;
  end if;

  select coalesce((settings->>'prefix')::text, 'TMG')
    into prefix
    from public.crm_settings
    where category = 'invoice'
    limit 1;

  select coalesce(max(
    nullif(regexp_replace(invoice_number, '[^0-9]', '', 'g'), '')::int
  ), 0) + 1
    into next_num
    from public.crm_invoices;

  new.invoice_number = prefix || '-' || lpad(next_num::text, 4, '0');
  return new;
end;
$$;

create trigger auto_invoice_number
  before insert on public.crm_invoices
  for each row
  execute function public.generate_invoice_number();
