-- Company-wide settings table (one row)
create table if not exists crm_company_settings (
  id bigserial primary key,
  company_name text not null default 'TechMigos',
  company_email text not null default 'info@techmigos.com',
  company_phone text not null default '+91 9959703547',
  company_address text not null default 'Hyderabad, Telangana, India',
  timezone text not null default 'Asia/Kolkata',
  currency text not null default 'INR',
  updated_at timestamptz not null default now()
);

-- Seed a default row so GET always returns something
insert into crm_company_settings (id) values (1) on conflict (id) do nothing;
