-- Employee workflow RPCs require an authenticated employee identity. Remove
-- any direct anonymous grants left by historical function definitions.
revoke all on function public.employee_update_project(bigint, jsonb) from anon;
revoke all on function public.employee_update_ticket(bigint, jsonb) from anon;

revoke all on function public.employee_update_project(bigint, jsonb) from public;
revoke all on function public.employee_update_ticket(bigint, jsonb) from public;
grant execute on function public.employee_update_project(bigint, jsonb) to authenticated, service_role;
grant execute on function public.employee_update_ticket(bigint, jsonb) to authenticated, service_role;
