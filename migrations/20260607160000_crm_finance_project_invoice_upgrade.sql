alter table crm_projects add column if not exists external_project_id text;
alter table crm_projects add column if not exists client_name text;
alter table crm_projects add column if not exists project_manager text;
alter table crm_projects add column if not exists priority text not null default 'medium';
alter table crm_projects add column if not exists budget numeric(12,2) not null default 0;
alter table crm_projects add column if not exists expenses numeric(12,2) not null default 0;
alter table crm_projects add column if not exists revenue numeric(12,2) not null default 0;
alter table crm_projects add column if not exists profit numeric(12,2) not null default 0;
alter table crm_projects add column if not exists team_members text;
alter table crm_projects add column if not exists notes text;

alter table crm_invoices add column if not exists invoice_date date;
alter table crm_invoices add column if not exists subtotal numeric(12,2) not null default 0;
alter table crm_invoices add column if not exists tax_amount numeric(12,2) not null default 0;
alter table crm_invoices add column if not exists discount_amount numeric(12,2) not null default 0;
alter table crm_invoices add column if not exists total_amount numeric(12,2) not null default 0;
alter table crm_invoices add column if not exists terms text;
alter table crm_invoices add column if not exists payment_instructions text;
alter table crm_invoices add column if not exists sent_at timestamptz;
alter table crm_invoices add column if not exists viewed_at timestamptz;
alter table crm_invoices add column if not exists paid_at timestamptz;

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

create index if not exists crm_projects_external_project_idx on crm_projects (external_project_id);
create index if not exists crm_ticket_messages_ticket_idx on crm_ticket_messages (ticket_id);
create index if not exists crm_invoice_items_invoice_idx on crm_invoice_items (invoice_id);
create index if not exists crm_invoice_events_invoice_idx on crm_invoice_events (invoice_id);
create index if not exists crm_finance_type_date_idx on crm_finance_transactions (transaction_type, transaction_date desc);
create index if not exists crm_finance_project_idx on crm_finance_transactions (project);
