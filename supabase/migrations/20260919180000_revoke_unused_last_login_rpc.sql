-- This legacy function has no application caller or trigger. Keep it available
-- only to trusted server-side code instead of exposing a SECURITY DEFINER RPC
-- to every authenticated workspace user.
revoke all on function public.record_crm_last_login() from public, anon, authenticated;
grant execute on function public.record_crm_last_login() to service_role;
