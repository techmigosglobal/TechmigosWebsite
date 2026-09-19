-- Username-to-email resolution is now server-side in username-login. Keep the
-- resolver available only to trusted service-role code, never browser roles.
revoke all on function public.get_email_by_username(text) from public;
revoke all on function public.get_email_by_username(text) from anon;
revoke all on function public.get_email_by_username(text) from authenticated;
grant execute on function public.get_email_by_username(text) to service_role;
