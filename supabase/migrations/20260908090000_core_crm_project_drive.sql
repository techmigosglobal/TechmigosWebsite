-- Core CRM delivery assignments and internal-only project files.

alter table public.crm_profiles
  add column if not exists username text,
  add column if not exists must_change_password boolean not null default false;

with normalized as (
  select
    id,
    lower(regexp_replace(coalesce(nullif(trim(name), ''), split_part(email, '@', 1)), '[^a-zA-Z0-9._-]+', '-', 'g')) as base_username
  from public.crm_profiles
  where username is null
), numbered as (
  select
    id,
    trim(both '-' from base_username) as username,
    count(*) over (partition by base_username) as duplicate_count
  from normalized
)
update public.crm_profiles profile
set username = case
  when numbered.duplicate_count > 1 then numbered.username || '-' || numbered.id
  else numbered.username
end
from numbered
where profile.id = numbered.id;

alter table public.crm_profiles
  alter column username set not null;

alter table public.crm_profiles
  drop constraint if exists crm_profiles_username_format;

alter table public.crm_profiles
  add constraint crm_profiles_username_format
  check (username ~ '^[a-z0-9][a-z0-9._-]{2,63}$');

create unique index if not exists crm_profiles_username_key
  on public.crm_profiles (lower(username));

alter table public.crm_tickets
  add column if not exists assigned_user_id uuid references auth.users(id) on delete set null;

create index if not exists crm_tickets_assigned_user_id_idx
  on public.crm_tickets (assigned_user_id);

create table if not exists public.crm_project_members (
  id bigserial primary key,
  project_id bigint not null references public.crm_projects(id) on delete cascade,
  profile_id bigint not null references public.crm_profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('lead', 'member')),
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, profile_id)
);

create index if not exists crm_project_members_profile_id_idx
  on public.crm_project_members (profile_id, project_id);

create table if not exists public.crm_project_folders (
  id bigserial primary key,
  project_id bigint not null references public.crm_projects(id) on delete cascade,
  parent_id bigint references public.crm_project_folders(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists crm_project_folders_unique_name
  on public.crm_project_folders (project_id, coalesce(parent_id, 0), lower(name));

create table if not exists public.crm_project_files (
  id bigserial primary key,
  project_id bigint not null references public.crm_projects(id) on delete cascade,
  folder_id bigint references public.crm_project_folders(id) on delete set null,
  object_path text not null unique check (object_path ~ '^projects/[0-9]+/.+'),
  original_name text not null check (length(trim(original_name)) between 1 and 255),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0 and size_bytes <= 52428800),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists crm_project_files_project_folder_idx
  on public.crm_project_files (project_id, folder_id, created_at desc);

insert into public.crm_project_members (project_id, profile_id, role, assigned_by)
select project.id, profile.id, 'lead', profile.auth_user_id
from public.crm_projects project
join public.crm_profiles profile on profile.auth_user_id = project.owner_user_id
on conflict (project_id, profile_id) do nothing;

create or replace function public.get_email_by_username(p_username text)
returns text
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select email
  from public.crm_profiles
  where lower(username) = lower(trim(p_username))
    and status = 'active'
  limit 1;
$$;

create or replace function public.is_project_member(p_project_id bigint)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select public.is_company_admin() or exists (
    select 1
    from public.crm_project_members member
    join public.crm_profiles profile on profile.id = member.profile_id
    where member.project_id = p_project_id
      and profile.auth_user_id = auth.uid()
      and profile.status = 'active'
  );
$$;

create or replace function public.can_access_ticket(p_ticket_id bigint)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select public.is_company_admin() or exists (
    select 1
    from public.crm_tickets ticket
    where ticket.id = p_ticket_id
      and (ticket.assigned_user_id = auth.uid() or public.is_project_member(ticket.project_id))
  );
$$;

create or replace function public.can_access_project_object(p_object_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  parts text[] := string_to_array(p_object_name, '/');
begin
  if coalesce(array_length(parts, 1), 0) < 3 or parts[1] <> 'projects' or parts[2] !~ '^[0-9]+$' then
    return false;
  end if;
  return public.is_project_member(parts[2]::bigint);
end;
$$;

create or replace function public.can_manage_project_object(p_object_name text)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select public.is_company_admin() or exists (
    select 1
    from public.crm_project_files file
    where file.object_path = p_object_name
      and file.uploaded_by = auth.uid()
  );
$$;

create or replace function public.set_project_members(p_project_id bigint, p_profile_ids bigint[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_company_admin() then
    raise exception using errcode = '42501', message = 'Only company admins can assign project members.';
  end if;
  if not exists (select 1 from public.crm_projects where id = p_project_id) then
    raise exception using errcode = 'P0002', message = 'Project not found.';
  end if;
  if exists (
    select 1
    from unnest(coalesce(p_profile_ids, '{}'::bigint[])) profile_id
    left join public.crm_profiles profile on profile.id = profile_id
    where profile.id is null or profile.role not in ('company_admin', 'company_member') or profile.status <> 'active'
  ) then
    raise exception using errcode = '22023', message = 'Project members must be active company users.';
  end if;

  delete from public.crm_project_members
  where project_id = p_project_id
    and profile_id <> all(coalesce(p_profile_ids, '{}'::bigint[]));

  insert into public.crm_project_members (project_id, profile_id, role, assigned_by)
  select p_project_id, profile_id, 'member', auth.uid()
  from unnest(coalesce(p_profile_ids, '{}'::bigint[])) profile_id
  on conflict (project_id, profile_id) do nothing;
end;
$$;

create or replace function public.employee_update_project(p_project_id bigint, p_patch jsonb)
returns public.crm_projects
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_project public.crm_projects;
begin
  if public.get_user_role() <> 'company_member' or not public.is_project_member(p_project_id) then
    raise exception using errcode = '42501', message = 'You are not assigned to this project.';
  end if;
  if exists (
    select 1 from jsonb_object_keys(coalesce(p_patch, '{}'::jsonb)) key
    where key not in ('status', 'health', 'progress', 'summary', 'notes')
  ) then
    raise exception using errcode = '22023', message = 'This project field cannot be changed by an employee.';
  end if;

  update public.crm_projects
  set status = coalesce(nullif(p_patch->>'status', ''), status),
      health = coalesce(nullif(p_patch->>'health', ''), health),
      progress = coalesce((p_patch->>'progress')::integer, progress),
      summary = coalesce(p_patch->>'summary', summary),
      notes = coalesce(p_patch->>'notes', notes),
      updated_at = now()
  where id = p_project_id
  returning * into updated_project;
  return updated_project;
end;
$$;

create or replace function public.employee_update_ticket(p_ticket_id bigint, p_patch jsonb)
returns public.crm_tickets
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_ticket public.crm_tickets;
begin
  if public.get_user_role() <> 'company_member' or not public.can_access_ticket(p_ticket_id) then
    raise exception using errcode = '42501', message = 'You are not assigned to this ticket.';
  end if;
  if exists (
    select 1 from jsonb_object_keys(coalesce(p_patch, '{}'::jsonb)) key
    where key not in ('status', 'priority', 'description')
  ) then
    raise exception using errcode = '22023', message = 'This ticket field cannot be changed by an employee.';
  end if;

  update public.crm_tickets
  set status = coalesce(nullif(p_patch->>'status', ''), status),
      priority = coalesce(nullif(p_patch->>'priority', ''), priority),
      description = coalesce(p_patch->>'description', description),
      updated_at = now()
  where id = p_ticket_id
  returning * into updated_ticket;
  return updated_ticket;
end;
$$;

grant execute on function public.is_project_member(bigint) to authenticated;
grant execute on function public.can_access_ticket(bigint) to authenticated;
grant execute on function public.can_access_project_object(text) to authenticated;
grant execute on function public.can_manage_project_object(text) to authenticated;
grant execute on function public.set_project_members(bigint, bigint[]) to authenticated;
grant execute on function public.employee_update_project(bigint, jsonb) to authenticated;
grant execute on function public.employee_update_ticket(bigint, jsonb) to authenticated;

alter table public.crm_project_members enable row level security;
alter table public.crm_project_folders enable row level security;
alter table public.crm_project_files enable row level security;

drop policy if exists "CRM admins can manage clients" on public.crm_clients;
drop policy if exists "CRM employees can read clients" on public.crm_clients;
create policy "CRM admins can manage clients"
  on public.crm_clients for all using (public.is_company_admin()) with check (public.is_company_admin());
create policy "Assigned employees can read linked clients"
  on public.crm_clients for select using (exists (
    select 1 from public.crm_projects project where project.client_id = crm_clients.id and public.is_project_member(project.id)
  ));

drop policy if exists "CRM admins can manage projects" on public.crm_projects;
drop policy if exists "CRM employees can read projects" on public.crm_projects;
create policy "CRM admins can manage projects"
  on public.crm_projects for all using (public.is_company_admin()) with check (public.is_company_admin());
create policy "Assigned employees can read projects"
  on public.crm_projects for select using (public.is_project_member(id));

drop policy if exists "CRM admins can manage tickets" on public.crm_tickets;
drop policy if exists "CRM employees can read tickets" on public.crm_tickets;
create policy "CRM admins can manage tickets"
  on public.crm_tickets for all using (public.is_company_admin()) with check (public.is_company_admin());
create policy "Assigned employees can read tickets"
  on public.crm_tickets for select using (public.can_access_ticket(id));

drop policy if exists "CRM admins can manage ticket messages" on public.crm_ticket_messages;
drop policy if exists "CRM employees can read ticket messages" on public.crm_ticket_messages;
create policy "CRM admins can manage ticket messages"
  on public.crm_ticket_messages for all using (public.is_company_admin()) with check (public.is_company_admin());
create policy "Assigned employees can read ticket messages"
  on public.crm_ticket_messages for select using (public.can_access_ticket(ticket_id));
create policy "Assigned employees can add internal ticket messages"
  on public.crm_ticket_messages for insert with check (
    public.get_user_role() = 'company_member'
    and public.can_access_ticket(ticket_id)
    and visibility = 'internal'
    and author_role = 'company_member'
  );

create policy "Admins can manage project members"
  on public.crm_project_members for all using (public.is_company_admin()) with check (public.is_company_admin());
create policy "Employees can read own project memberships"
  on public.crm_project_members for select using (profile_id in (
    select id from public.crm_profiles where auth_user_id = auth.uid() and status = 'active'
  ));

create policy "Admins can manage project folders"
  on public.crm_project_folders for all using (public.is_company_admin()) with check (public.is_company_admin());
create policy "Assigned employees can read project folders"
  on public.crm_project_folders for select using (public.is_project_member(project_id));
create policy "Assigned employees can create project folders"
  on public.crm_project_folders for insert with check (
    public.get_user_role() = 'company_member' and public.is_project_member(project_id) and created_by = auth.uid()
  );
create policy "Employees can delete their project folders"
  on public.crm_project_folders for delete using (public.get_user_role() = 'company_member' and created_by = auth.uid());

create policy "Admins can manage project files"
  on public.crm_project_files for all using (public.is_company_admin()) with check (public.is_company_admin());
create policy "Assigned employees can read project files"
  on public.crm_project_files for select using (public.is_project_member(project_id));
create policy "Assigned employees can add project files"
  on public.crm_project_files for insert with check (
    public.get_user_role() = 'company_member' and public.is_project_member(project_id) and uploaded_by = auth.uid()
  );
create policy "Employees can delete their project files"
  on public.crm_project_files for delete using (public.get_user_role() = 'company_member' and uploaded_by = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
  false,
  52428800,
  array[
    'application/pdf', 'text/plain', 'text/csv',
    'application/zip', 'application/x-zip-compressed',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png', 'image/jpeg', 'image/webp'
  ]
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Assigned company users can read project files"
  on storage.objects for select using (bucket_id = 'project-files' and public.can_access_project_object(name));
create policy "Assigned company users can upload project files"
  on storage.objects for insert with check (bucket_id = 'project-files' and public.can_access_project_object(name));
create policy "Project file owners can update project files"
  on storage.objects for update using (bucket_id = 'project-files' and public.can_manage_project_object(name)) with check (bucket_id = 'project-files' and public.can_manage_project_object(name));
create policy "Project file owners can delete project files"
  on storage.objects for delete using (bucket_id = 'project-files' and public.can_manage_project_object(name));
