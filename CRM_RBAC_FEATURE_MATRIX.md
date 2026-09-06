# TechMigos CRM: RBAC and Feature Matrix

Audit date: 3 August 2026
Scope: login portals, role enforcement, clients, users, projects, tickets, finance, invoices, reporting, and the client/company hand-off.

This is a source-grounded contract for the current implementation. It follows the login page, the shared CRM layout, the client portal, and the Supabase schema/RLS policies. It is not a substitute for a live smoke test with one active account for each role; no credentials were available for that test in this workspace.

## Executive summary

There are exactly three login roles in the database:

| Role | Portal | Primary responsibility | Data boundary |
| --- | --- | --- | --- |
| `company_admin` | Company CRM | Own the workspace, users, settings, delivery, support, billing, and reporting | Company-wide staff access; administrator-only profiles and settings |
| `company_member` | Company CRM | Operate day-to-day delivery, support, client, billing, and finance workflows | Company-wide operational records; own profile only in the employee/user directory |
| `client` | Client portal | Review linked delivery and billing information and communicate through support | Only the linked client, projects, invoices, tickets, and external ticket messages |

The role constraint is defined in [`crm_profiles`](supabase/migrations/20260628062713_init_crm_schema.sql#L10-L24). Both company roles are treated as staff by `is_company_staff()`, while the client role is scoped through `get_user_client_id()` and client-specific RLS policies ([schema helpers and policies](supabase/migrations/20260628062713_init_crm_schema.sql#L320-L351), [RLS policies](supabase/migrations/20260628062713_init_crm_schema.sql#L353-L495)).

## Login and portal routing

1. The login page accepts either an email address or a username.
2. A username is resolved through the `get_email_by_username` Supabase RPC.
3. Supabase Auth verifies the email/password.
4. The matching `crm_profiles` row is loaded. The account must have `status = active`; `pending` and `inactive` profiles are rejected.
5. `client` routes to `/client`; both company roles route to `/company` ([login flow](src/pages/login.astro#L183-L235)).
6. The company layout re-checks the profile and refuses client profiles. The client page re-checks the profile and redirects staff to the company portal ([company boot](src/layouts/CrmLayout.astro#L7942-L8005), [client boot](src/pages/client.astro#L508-L518)).

Accounts are invite/provisioning based; there is no public signup in the login experience. Public contact, lead, newsletter, and career forms are submission workflows, not login roles.

## Role responsibilities and capabilities

### Company Admin (`company_admin`)

The administrator owns the company workspace and is the only role allowed to manage login profiles and shared CRM configuration.

- Create, invite, update, deactivate, delete, search, and export user profiles.
- Assign one of the three database roles and link client logins to a `client_id`.
- Manage company and invoice settings.
- Manage all company clients, projects, tickets, invoices, finance records, reports, and analytics.
- Review the employee directory, assignments, workload, and activity.
- Resolve tickets, reassign work, attach finance proof, and change finance status.
- See all staff profiles after the administrator-only profile visibility migration ([user management UI](src/layouts/CrmLayout.astro#L6447-L6522), [profile visibility policy](supabase/migrations/20260712091500_crm_role_visibility.sql#L1-L16)).

### Company Member (`company_member`)

The member role is operational staff. Current RLS grants company members the same company-wide CRUD boundary for operational tables as administrators, but the UI intentionally withholds account-directory administration and shared settings.

- Operate clients, projects, support tickets, invoices, finance records, analytics, reports, and activity.
- Create and edit operational records, move project/ticket statuses, reassign tickets, resolve tickets, and upload finance proofs.
- View/export operational reports.
- See the employee area only within the profile rows returned by RLS; the current migration limits non-admins to their own profile.
- Cannot create, invite, edit, or delete user accounts.
- Cannot change company or invoice defaults; shared settings are administrator-only in the portal guard and the dedicated migration ([settings RLS migration](supabase/migrations/20260803120000_crm_admin_settings_rbac.sql#L1-L10)).

This distinction matters: the previous UI wording described members as “assigned” or “view only” in places, but there is no assignment-scoped RLS policy for projects, tickets, clients, invoices, or finance. The access matrix now says “Staff manage” where that is the enforced source behavior. If members should be restricted to assigned records in future, that needs an explicit assignment policy and backend design rather than UI-only labels.

### Client (`client`)

The client role is a customer-facing portal account linked to one client company.

- View the linked company overview.
- View linked projects, progress, health, and due dates.
- View linked invoices, balances, statuses, invoice line items, and printable/downloadable invoice previews.
- Create a support ticket for the linked client, optionally linked to a project.
- View ticket status and exchange external messages on linked tickets.
- Cannot view finance records, finance proofs, internal ticket messages, employee data, analytics, reports, user management, or company settings.

The client portal explicitly scopes overview queries by the logged-in profile’s `client_id` ([client overview](src/pages/client.astro#L225-L242)). The corresponding client RLS rules cover the linked client, projects, tickets, external ticket messages, invoices, and invoice items ([client policies](supabase/migrations/20260628062713_init_crm_schema.sql#L384-L488)).

## Module and feature matrix

“Manage” below means the current company-staff RLS boundary plus the CRM controls. It does not imply assignment-level restriction.

| Module | Company Admin | Company Member | Client | Current implementation |
| --- | --- | --- | --- | --- |
| Dashboard | Full | Full | Client overview | KPIs for projects, tickets, clients, finance, receivables, cash flow, and recent activity ([dashboard](src/layouts/CrmLayout.astro#L3116-L3195)) |
| Projects | Manage | Manage | View linked projects | Board/list views, status filter, search, export, progress, health, budget, detail panel, drag-and-drop status movement, and project CRUD ([projects](src/layouts/CrmLayout.astro#L3482-L3600)) |
| Support tickets | Manage | Manage | View/create own and reply externally | Board/list views, priority/status filters, search, assignment, drag-and-drop, quick “Resolve”, “Set In Progress”, ticket detail, CRUD, and conversation messages ([ticket lifecycle UI](src/layouts/CrmLayout.astro#L3664-L3825)) |
| Clients | Full | Staff manage | View own company | Search/filter, client detail, linked project and invoice summaries, outstanding billing, activity, export, and CRUD ([clients](src/layouts/CrmLayout.astro#L6249-L6348)) |
| Finance | Full | Staff manage | No access | Overview, transactions, invoices, reports, income/expense/salary categories, pending/paid/received statuses, proof upload/preview, cash-flow summaries, export, and private proof storage ([finance](src/layouts/CrmLayout.astro#L4268-L4748)) |
| Invoices | Full | Staff manage | Read linked invoices | Builder with line items, totals, tax, discount, received amount, balance, status, recurring flag, printable invoice preview, and invoice item persistence ([invoice builder](src/layouts/CrmLayout.astro#L5063-L5161), [invoice CRUD](src/layouts/CrmLayout.astro#L2954-L3008)) |
| Analytics | Full | View | No access | Revenue/expense, ticket resolution, project, client, and workload calculations ([analytics](src/layouts/CrmLayout.astro#L5768-L5885)) |
| Reports | Full | View/export | No access | Date/type filters, executive/finance/project/client report views, print/PDF and CSV exports ([reports](src/layouts/CrmLayout.astro#L6037-L6125)) |
| Employees | Full | Own profile boundary | No access | Employee directory, departments, assignments, workload, activity, and profile actions; non-admin profile visibility is restricted by RLS ([employees](src/layouts/CrmLayout.astro#L6350-L6414)) |
| User Management | Full | Restricted to own permission summary | No access | Admin access directory, role/status display, create/invite/export, and live role matrix; non-admins see their own access summary ([user management](src/layouts/CrmLayout.astro#L6447-L6522)) |
| Settings | Full | Restricted | No access | Company and invoice defaults, notifications/integrations configuration; UI and RLS are administrator-only ([settings](src/layouts/CrmLayout.astro#L6550-L6741)) |

## Project workflow

Projects are stored with a client link, manager/owner, budget, expenses, revenue, health, progress, due date, summary, and notes ([project schema](supabase/migrations/20260628062713_init_crm_schema.sql#L63-L84)). The active CRM workflow is:

1. Staff create a project and select a client.
2. Staff track it in board or list view.
3. Progress and health are shown in the detail panel and KPI cards.
4. Drag-and-drop or edit actions move the status through `planning`, `active`, `review`, `completed`, `on_hold`, or `cancelled`.
5. Linked tickets and invoices provide operational and billing context.
6. The linked client sees only the project rows where `client_id` matches their profile.

## Ticket workflow and resolving

Tickets support `open`, `in_progress`, `waiting`, `resolved`, and `closed` statuses, plus `low`, `medium`, `high`, and `urgent` priority ([ticket schema](supabase/migrations/20260628062713_init_crm_schema.sql#L105-L130)).

1. A company user creates or receives a ticket, links it to a client/project, and assigns an owner.
2. Staff filter, search, edit, drag between workflow columns, or use the detail actions.
3. “Set In Progress” moves active work into execution.
4. “Resolve” sets the record to `resolved`; `closed` is the final closed state.
5. Clients can create tickets for their linked client and reply only with `external` messages.
6. Staff can manage all ticket messages, including internal/external visibility; client RLS only exposes external messages on their own tickets ([ticket message policies](supabase/migrations/20260628062713_init_crm_schema.sql#L424-L462)).

## Finance workflow and the proof/pending fixes

Finance has two intentionally separate record families:

- `crm_finances` is the transaction ledger. It supports `income`, `expense`, `revenue`, `salary`, and `invoice` entries. An invoice entry records the financial event in Transactions and may link to a generated invoice through `invoice_id`.
- `crm_invoices` and `crm_invoice_items` are the generated invoice document and its line items. Invoice Generation saves those records atomically; saving a generated invoice also maintains its linked invoice ledger entry automatically.

The Income KPI includes settled invoice ledger entries and settled `income`/`revenue` rows. Pending, draft, sent, overdue, and half-payment invoice entries remain outstanding and do not increase Income or Available balance; cancelled invoices are excluded. The Financial Management summary also exposes outstanding expense obligations for unpaid `expense` and `salary` rows; those rows do not reduce Available balance until settled. Finance is company-staff only; clients have no finance-table policy.

The inline transaction row now works as follows:

- Required fields are date, category, description, amount, and status.
- `invoice` entries are visible in both All Transactions and the Invoices filter. Pending invoice entries are outstanding; only paid/received invoice entries contribute to Income.
- Once description and amount are present, changes are debounced for 700ms and saved through the finance portal endpoint.
- The row reports `Draft`, `Changes pending`, `Saving…`, `Saved`, or an actionable error.
- New rows become persisted records automatically; the old `Save first` proof message and manual row Save dependency are gone.
- Existing finance edits continue through the ledger autosave path.

Proof controls now use inline SVG icons rather than the broken `â†‘` text. A proof can be viewed, opened in a new tab, uploaded, or replaced. The `finance-proofs` bucket remains private and its storage policies allow only company staff ([private proof policies](supabase/migrations/20260628062713_init_crm_schema.sql#L593-L630)).

Pending records now have a clear yellow status pill with a clock icon, a highlighted row, a “Pending review” callout, and a context-aware action: income/revenue can be marked `received`; expense/salary can be marked `paid`. The underlying status remains explicit and auditable rather than being silently treated as paid.

## User management and access enforcement

There are three layers of protection:

1. **Login gate:** Supabase Auth plus an active `crm_profiles` row and a constrained role.
2. **Client-side UX guard:** hidden navigation and disabled create/edit/delete controls for roles without the action; direct company portal resources are checked by `ensurePortalAccess()` ([guards](src/layouts/CrmLayout.astro#L2732-L2754)).
3. **Supabase enforcement:** RLS policies use `is_company_staff()`, `is_company_admin()`, or `get_user_client_id()` so a client cannot gain company access by changing browser UI ([policies](supabase/migrations/20260628062713_init_crm_schema.sql#L320-L495), [admin settings/profile visibility migrations](supabase/migrations/20260712091500_crm_role_visibility.sql#L1-L16), [supabase/migrations/20260803120000_crm_admin_settings_rbac.sql#L1-L10)).

The CRM loads the profile directory only for administrators; disabled resources are omitted from the active load list and direct navigation redirects to the dashboard ([data loading and disabled-resource handling](src/layouts/CrmLayout.astro#L7899-L7949)).

## Active versus disabled CRM areas

The active navigation is Dashboard, Projects, Support Tickets, Finance, Analytics, Reports, Clients, Employees, User Management, and Settings ([navigation](src/lib/crmNav.ts#L1-L12)). Leads, deals, follow-ups, and campaigns remain represented in the database or public submission flows, but are intentionally disabled in this active CRM workspace and excluded from normal data loading ([disabled resource set](src/layouts/CrmLayout.astro#L2554-L2555)).

Public contact, lead, newsletter, and career forms can submit data through public insert policies. They do not create a CRM login, grant a role, or enter the company/client portal.

## Verification findings and follow-up boundary

- Confirmed source roles: `company_admin`, `company_member`, `client`.
- Confirmed portal routing: active client to `/client`; active company roles to `/company`.
- Confirmed pending/inactive login rejection after the access fix.
- Confirmed company-member operational access is broader than assignment-only wording; no assignment-level RLS currently exists.
- Confirmed profiles and shared settings are administrator-only after the RBAC alignment changes.
- Confirmed finance records and private finance proofs are staff-only.
- Live browser/database smoke testing with real admin, member, and client accounts is still required before calling the complete workflow end-to-end verified. The source audit cannot prove account-specific data, RLS execution in the hosted project, or real upload previews without those credentials.

Recommended live smoke sequence:

1. Sign in as admin; create a member and a client login, verify active status, and check settings/user management.
2. Sign in as member; create a project, ticket, invoice, and finance record; resolve a ticket; mark a pending finance record paid/received; upload a proof.
3. Sign in as client; verify only linked projects/invoices/tickets appear; create a ticket and external reply; confirm finance, settings, employees, and other clients are inaccessible.
4. Attempt direct Supabase reads/writes for each forbidden boundary and record the RLS result.
