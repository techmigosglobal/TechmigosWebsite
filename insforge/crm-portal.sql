create table if not exists crm_profiles (
  id bigserial primary key,
  auth_user_id text not null unique,
  email text not null unique,
  name text not null,
  role text not null check (role in ('company_admin', 'company_member', 'client')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  client_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_clients (
  id bigserial primary key,
  name text not null,
  company text,
  email text not null,
  phone text,
  status text not null default 'active',
  marketing_opt_in boolean not null default false,
  owner_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table crm_profiles
  add constraint crm_profiles_client_id_fkey
  foreign key (client_id) references crm_clients(id) on delete set null;

create table if not exists crm_leads (
  id bigserial primary key,
  public_source_table text,
  public_source_id bigint,
  name text not null,
  email text not null,
  company text,
  service text,
  budget text,
  message text,
  source_path text,
  status text not null default 'new',
  priority text not null default 'medium',
  assigned_to text,
  client_id bigint references crm_clients(id) on delete set null,
  next_followup_at timestamptz,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_projects (
  id bigserial primary key,
  client_id bigint not null references crm_clients(id) on delete cascade,
  external_project_id text,
  name text not null,
  client_name text,
  project_manager text,
  status text not null default 'planning',
  health text not null default 'on_track',
  priority text not null default 'medium',
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  budget numeric(12,2) not null default 0,
  expenses numeric(12,2) not null default 0,
  revenue numeric(12,2) not null default 0,
  profit numeric(12,2) not null default 0,
  team_members text,
  notes text,
  summary text,
  start_date date,
  due_date date,
  owner_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_finance_transactions (
  id bigserial primary key,
  transaction_date date,
  transaction_type text not null check (transaction_type in ('income', 'expense', 'revenue', 'salary')),
  reference_id text,
  title text not null,
  client text,
  project text,
  paid_by text,
  received_by text,
  payment_method text,
  department text,
  region text,
  quarter text,
  status text not null default 'pending',
  amount numeric(12,2) not null default 0,
  notes text,
  source text,
  source_ref text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_deals (
  id bigserial primary key,
  client_id bigint references crm_clients(id) on delete set null,
  lead_id bigint references crm_leads(id) on delete set null,
  title text not null,
  stage text not null default 'qualified',
  value numeric(12,2) not null default 0,
  currency text not null default 'INR',
  expected_close_date date,
  owner_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_support_tickets (
  id bigserial primary key,
  client_id bigint references crm_clients(id) on delete cascade,
  project_id bigint references crm_projects(id) on delete set null,
  subject text not null,
  description text not null,
  status text not null default 'open',
  priority text not null default 'medium',
  created_by_user_id text,
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_ticket_messages (
  id bigserial primary key,
  ticket_id bigint not null references crm_support_tickets(id) on delete cascade,
  author_user_id text,
  author_name text,
  author_role text not null default 'company',
  body text not null,
  visibility text not null default 'shared',
  created_at timestamptz not null default now()
);

create table if not exists crm_followups (
  id bigserial primary key,
  related_type text not null,
  related_id bigint,
  title text not null,
  due_at timestamptz,
  status text not null default 'pending',
  assigned_to text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_invoices (
  id bigserial primary key,
  client_id bigint not null references crm_clients(id) on delete cascade,
  project_id bigint references crm_projects(id) on delete set null,
  invoice_number text not null unique,
  amount numeric(12,2) not null default 0,
  currency text not null default 'INR',
  status text not null default 'draft',
  invoice_date date,
  due_date date,
  customer_name text,
  customer_company text,
  customer_email text,
  customer_phone text,
  billing_address text,
  print_date date,
  service_title text,
  reference_number text,
  subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  terms text,
  payment_instructions text,
  notes text,
  file_url text,
  sent_at timestamptz,
  viewed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_invoice_items (
  id bigserial primary key,
  invoice_id bigint not null references crm_invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  rate numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists crm_invoice_events (
  id bigserial primary key,
  invoice_id bigint not null references crm_invoices(id) on delete cascade,
  actor_user_id text,
  actor_name text,
  action text not null,
  summary text,
  created_at timestamptz not null default now()
);

create table if not exists crm_invoice_settings (
  id bigserial primary key,
  prefix text not null default 'TMG',
  starting_number integer not null default 1,
  tax_label text not null default 'Tax',
  tax_rate numeric(6,2) not null default 0,
  default_terms text,
  default_payment_instructions text,
  updated_at timestamptz not null default now()
);

create table if not exists crm_notes (
  id bigserial primary key,
  related_type text not null,
  related_id bigint,
  body text not null,
  created_by_user_id text,
  visibility text not null default 'company',
  created_at timestamptz not null default now()
);

create table if not exists crm_campaigns (
  id bigserial primary key,
  name text not null,
  subject text not null,
  body text not null,
  status text not null default 'draft',
  msg91_template_id text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_campaign_recipients (
  id bigserial primary key,
  campaign_id bigint not null references crm_campaigns(id) on delete cascade,
  client_id bigint references crm_clients(id) on delete set null,
  lead_id bigint references crm_leads(id) on delete set null,
  email text not null,
  name text,
  marketing_opt_in boolean not null default false,
  status text not null default 'queued',
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists crm_team_activities (
  id bigserial primary key,
  actor_user_id text,
  actor_name text,
  action text not null,
  entity_type text,
  entity_id bigint,
  summary text,
  created_at timestamptz not null default now()
);

create index if not exists crm_profiles_email_idx on crm_profiles (lower(email));
create index if not exists crm_profiles_role_idx on crm_profiles (role);
create index if not exists crm_clients_email_idx on crm_clients (lower(email));
create index if not exists crm_leads_created_at_idx on crm_leads (created_at desc);
create index if not exists crm_leads_email_idx on crm_leads (lower(email));
create index if not exists crm_projects_client_idx on crm_projects (client_id);
create index if not exists crm_projects_external_project_idx on crm_projects (external_project_id);
create index if not exists crm_tickets_client_idx on crm_support_tickets (client_id);
create index if not exists crm_ticket_messages_ticket_idx on crm_ticket_messages (ticket_id);
create index if not exists crm_invoices_client_idx on crm_invoices (client_id);
create index if not exists crm_invoice_items_invoice_idx on crm_invoice_items (invoice_id);
create index if not exists crm_invoice_events_invoice_idx on crm_invoice_events (invoice_id);
create index if not exists crm_campaign_recipients_campaign_idx on crm_campaign_recipients (campaign_id);
create index if not exists crm_finance_type_date_idx on crm_finance_transactions (transaction_type, transaction_date desc);
create index if not exists crm_finance_project_idx on crm_finance_transactions (project);
