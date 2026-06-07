create table if not exists rate_limit_counters (
  bucket_key text not null,
  window_start bigint not null,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (bucket_key, window_start)
);

create table if not exists contact_leads (
  id bigserial primary key,
  name text not null,
  email text not null,
  company text,
  service text,
  budget text,
  message text not null,
  source_path text,
  status text not null default 'new',
  priority text not null default 'medium',
  notification_status text not null default 'pending',
  notified_at timestamptz,
  assigned_to text,
  next_followup_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists newsletter_subscribers (
  id bigserial primary key,
  email text not null,
  source_path text,
  status text not null default 'subscribed',
  priority text not null default 'low',
  notification_status text not null default 'pending',
  notified_at timestamptz,
  assigned_to text,
  next_followup_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists newsletter_subscribers_email_unique
  on newsletter_subscribers (lower(email));

create table if not exists career_applications (
  id bigserial primary key,
  job_title text not null,
  name text not null,
  email text not null,
  linkedin text,
  portfolio text,
  cover_letter text not null,
  resume_original_name text,
  resume_stored_file_name text,
  resume_mime_type text,
  resume_size integer,
  resume_path text,
  resume_url text,
  source_path text,
  status text not null default 'new',
  priority text not null default 'medium',
  notification_status text not null default 'pending',
  notified_at timestamptz,
  assigned_to text,
  next_followup_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_leads_created_at_idx on contact_leads (created_at desc);
create index if not exists contact_leads_email_idx on contact_leads (email);
create index if not exists career_applications_created_at_idx on career_applications (created_at desc);
create index if not exists rate_limit_counters_updated_at_idx on rate_limit_counters (updated_at);
