-- The initial schema created `todos` as a demo utility table and granted
-- public read access. It is not part of the active CRM repository contract,
-- but any retained table must still be private and least-privilege.
alter table if exists public.todos enable row level security;

drop policy if exists "Anyone can read todos" on public.todos;
drop policy if exists "Company admins can maintain unused todos" on public.todos;

revoke all on table public.todos from anon, authenticated;
grant select, insert, update, delete on table public.todos to authenticated;

create policy "Company admins can maintain unused todos"
  on public.todos
  for all
  to authenticated
  using ((select private.is_company_admin()))
  with check ((select private.is_company_admin()));
