-- Keep issued invoice context stable when a project or shared brand asset changes.
alter table public.crm_invoices
  add column if not exists project_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists invoice_branding jsonb not null default '{}'::jsonb;
