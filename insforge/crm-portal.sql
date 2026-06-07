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
  name text not null,
  status text not null default 'planning',
  health text not null default 'on_track',
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  summary text,
  start_date date,
  due_date date,
  owner_user_id text,
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
  due_date date,
  notes text,
  file_url text,
  created_at timestamptz not null default now(),
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
create index if not exists crm_tickets_client_idx on crm_support_tickets (client_id);
create index if not exists crm_invoices_client_idx on crm_invoices (client_id);
create index if not exists crm_campaign_recipients_campaign_idx on crm_campaign_recipients (campaign_id);
