-- RPC: resolve a username (name field) to an email for login
-- SECURITY DEFINER so it bypasses RLS; only returns email, nothing else.
create or replace function public.get_email_by_username(p_username text)
returns text
language sql
security definer
stable
as $$
  select email
  from public.crm_profiles
  where lower(name) = lower(p_username)
  limit 1;
$$;

-- Allow unauthenticated (anon) callers to execute this function
grant execute on function public.get_email_by_username(text) to anon;
