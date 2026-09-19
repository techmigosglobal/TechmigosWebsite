-- Remove explicit legacy anon grants left behind after the public ACL was
-- tightened. The username resolver is the only pre-auth RPC retained.

revoke all on function public.can_access_project_object(text) from anon;
revoke all on function public.can_access_ticket(bigint) from anon;
revoke all on function public.can_manage_project_object(text) from anon;
revoke all on function public.employee_update_project(bigint, jsonb) from anon;
revoke all on function public.employee_update_ticket(bigint, jsonb) from anon;

revoke all on function public.get_email_by_username(text) from authenticated;
revoke all on function public.get_user_client_id() from anon;
revoke all on function public.get_user_role() from anon;
revoke all on function public.is_company_admin() from anon;
revoke all on function public.is_company_staff() from anon;
revoke all on function public.is_project_member(bigint) from anon;
revoke all on function public.purge_confirmed_crm_records(jsonb, text) from anon;
revoke all on function public.record_crm_last_login() from anon;
revoke all on function public.rls_auto_enable() from anon, authenticated;
revoke all on function public.set_project_members(bigint, bigint[]) from anon;

grant execute on function public.get_email_by_username(text) to anon;
grant execute on function public.rls_auto_enable() to service_role;
