# TechMigos CRM: RBAC and Feature Matrix

Audit date: 19 September 2026
Scope: login portals, role enforcement, clients, users, projects, tickets, finance, invoices, reporting, and the client/company hand-off.

This is a source-grounded contract for the current implementation. It follows the canonical route policy, shared repository, client portal, and Supabase RLS policies. It is not a substitute for live browser testing with provisioned accounts; no `CRM_*` test identities are available in this checkout.

## Executive summary

There are exactly three login roles in the database:

| Role | Portal | Primary responsibility | Data boundary |
| --- | --- | --- | --- |
| `company_admin` | Company CRM | Own the workspace, users, settings, delivery, support, billing, and reporting | Company-wide staff access; administrator-only profiles and settings |
| `company_member` | Company CRM | Operate assigned project delivery and related support | Assigned projects/files/tickets only; no company-wide client, finance, user, or settings access |
| `client` | Client portal | Review linked delivery and billing information and communicate through support | Only the linked client, projects, invoices, tickets, and external ticket messages |

The role contract is centralized in [`routePolicy.js`](src/lib/crm/routePolicy.js), enforced by [`permissions.js`](src/lib/crm/permissions.js), and backed by the repository and Supabase RLS. Both company roles are staff identities, but employees are narrowed to assigned operational work; clients are scoped to their linked `client_id`.

## Login and portal routing

1. The login page accepts either an email address or a username.
2. Email sign-in calls Supabase Auth directly. Username sign-in calls the `username-login` Edge Function, which resolves the email server-side, verifies the password with Supabase Auth, and returns session tokens only.
3. The browser establishes the returned session and loads the matching `crm_profiles` row. The account must have `status = active`; `pending` and `inactive` profiles are rejected.
4. `client` routes to `/client`; both company roles route to `/company` ([login flow](src/pages/login.astro)).
5. The company layout re-checks the profile and refuses client profiles. The client page re-checks the profile and redirects staff to the company portal.

The updated frontend is not yet deployed. The hosted anonymous username-resolver grant is being kept temporarily for compatibility with the currently served login page; revoke it after deploying the frontend change.

Accounts are invite/provisioning based; there is no public signup in the login experience. Public contact, lead, newsletter, and career forms are submission workflows, not login roles.

## Role responsibilities and capabilities

### Company Admin (`company_admin`)

The administrator owns the company workspace and is the only role allowed to manage login profiles and shared CRM configuration.

- Create, invite, update, deactivate, search, and export user profiles. Profiles are deactivated, not deleted.
- Assign one of the three database roles and link client logins to a `client_id`.
- Manage company and invoice settings.
- Manage all company clients, projects, tickets, invoices, finance records, reports, and analytics.
- Review the employee directory, assignments, workload, and activity.
- Resolve tickets, reassign work, attach finance proof, and change finance status.
- Manage staff profiles through the admin-only [User Management feature](src/lib/crm/features/users.js) and guarded repository actions.

### Company Member (`company_member`)

The member role is a least-privilege operator. Route visibility, repository checks, and RLS constrain work to assigned projects and related tickets.

- View Dashboard, assigned Projects, Files, Support, Analytics, and Reports.
- Update only allowed operational fields on assigned projects/tickets; add permitted internal support notes; upload files and create project folders within assigned projects.
- Cannot create or reassign projects, access company-wide clients/invoices/finance, manage users, or change settings.
- Analytics and reports use assigned project/ticket data only; finance, invoice, client, and profile records are excluded.

### Client (`client`)

The client role is a customer-facing portal account linked to one client company.

- View the linked company overview.
- View linked projects, progress, health, and due dates.
- View linked invoices, balances, statuses, invoice line items, and printable/downloadable invoice previews.
- Create a support ticket for the linked client, optionally linked to a project.
- View ticket status and exchange external messages on linked tickets.
- Cannot view finance records, finance proofs, internal ticket messages, employee data, analytics, reports, user management, or company settings.

The client portal loads its scoped overview through the shared [repository](src/lib/crm/repository.js) and [portal controller](src/scripts/client-portal.js). Client RLS covers the linked client, projects, tickets, external ticket messages, invoices, and invoice items.

## Module and feature matrix

| Company route | Admin | Employee | Client | Scope |
| --- | --- | --- | --- | --- |
| Dashboard | Company KPIs | Assigned project/ticket summary | `/client` overview | Live repository snapshot; no demo rows |
| Projects | Create/update/assign all | Read assigned; update allowed operational fields | Read linked project status | Relationships use canonical client/project/profile IDs |
| Files | Manage company project drive | Read/upload within assigned projects | Not a company route; client file exposure is separate | Private storage, validated paths/types/sizes, signed URLs |
| Support | Full queue and conversation management | Assigned-ticket visibility, permitted workflow updates, internal notes | Own tickets and external replies only | Internal/external message visibility is explicit |
| Finance | Full finance and invoice actions | No access | Linked invoices only in client portal | Shared totals, balances, and ledger selectors |
| Analytics | Company-wide | Assigned project/ticket scope | No access | Uses shared role-scoped report selectors |
| Reports | Company-wide, print/CSV/PDF | Assigned project/ticket scope, print/CSV/PDF | No access | Same source selectors as dashboard/analytics |
| User Management | Manage/invite/deactivate users | No access | No access | Admin-only route and repository actions |
| Settings | Read/update company and invoice settings | No access | No access | Allowlisted persisted fields |

## Project workflow

Projects are stored with a client link, manager/owner, budget, expenses, revenue, health, progress, due date, summary, and notes ([project schema](supabase/migrations/20260628062713_init_crm_schema.sql#L63-L84)). The active CRM workflow is:

1. An administrator creates a client-linked project and assigns employees.
2. Employees see only assigned projects, update permitted status/progress/health fields, and add delivery files.
3. The administrator sees the same project and file records in the company workspace.
4. The linked client sees project status and progress in `/client`.

## Ticket workflow and resolving

Tickets support `open`, `in_progress`, `waiting`, `resolved`, and `closed` statuses, plus `low`, `medium`, `high`, and `urgent` priority ([ticket schema](supabase/migrations/20260628062713_init_crm_schema.sql#L105-L130)).

1. A client creates a ticket for their linked client/project, or an administrator creates/manages one.
2. The administrator links and assigns work; employees see only tickets in their assigned-project scope.
3. Employees add internal notes and make only permitted workflow changes; administrators reply externally and close the ticket.
4. The client sees external conversation messages only and cannot see internal notes.

## Finance workflow and the proof/pending fixes

Finance has two intentionally separate record families:

- `crm_finances` is the transaction ledger. It supports `income`, `expense`, `revenue`, `salary`, and `invoice` entries. An invoice entry records the financial event in Transactions and may link to a generated invoice through `invoice_id`.
- `crm_invoices` and `crm_invoice_items` are the generated invoice document and its line items. Invoice Generation saves those records atomically; saving a generated invoice also maintains its linked invoice ledger entry automatically.

The Income KPI includes settled invoice ledger entries and settled `income`/`revenue` rows. Pending, draft, sent, overdue, and half-payment invoice entries remain outstanding and do not increase Income or Available balance; cancelled invoices are excluded. The Financial Management summary also exposes outstanding expense obligations for unpaid `expense` rows; those rows do not reduce Available balance until settled. Finance is administrator-only; employees and clients cannot read finance records or proof attachments. Clients see only linked invoice documents and balances.

The inline transaction row now works as follows:

- Required fields are date, category, description, amount, and status.
- `invoice` entries are visible in both All Transactions and the Invoices filter. Pending invoice entries are outstanding; only paid/received invoice entries contribute to Income.
- Once description and amount are present, changes are debounced for 700ms and saved through the finance portal endpoint.
- The row reports `Draft`, `Changes pending`, `Saving…`, `Saved`, or an actionable error.
- New rows become persisted records automatically; the old `Save first` proof message and manual row Save dependency are gone.
- Existing finance edits continue through the ledger autosave path.

Proof controls use shared inline icons. A proof can be viewed, opened in a new tab, uploaded, or replaced. The `finance-proofs` bucket is private and administrators alone can read or mutate its records ([storage constraints](supabase/migrations/20260918130000_private_storage_path_constraints.sql), [admin-only read policy](supabase/migrations/20260919130000_admin_only_finance_proof_reads.sql)).

Pending records now have a clear yellow status pill with a clock icon, a highlighted row, a “Pending review” callout, and a context-aware action: income/revenue can be marked `received`; expense/salary can be marked `paid`. The underlying status remains explicit and auditable rather than being silently treated as paid.

## User management and access enforcement

There are three layers of protection:

1. **Login gate:** Supabase Auth plus an active `crm_profiles` row and a constrained role.
2. **Client-side UX guard:** the canonical [`routePolicy.js`](src/lib/crm/routePolicy.js) drives navigation and route permissions; unavailable actions are omitted.
3. **Supabase enforcement:** repository authorization and RLS validate role, assignment, client linkage, private files, and message visibility independently of the UI.

The profile directory is loaded only for administrators; disabled resources are omitted from the active workspace snapshot.

## Active versus disabled CRM areas

The company workspace has exactly nine routes: Dashboard, Projects, Files, Support, Finance, Analytics, Reports, User Management, and Settings ([route policy](src/lib/crm/routePolicy.js)). Clients and employee management are sections inside User Management, not separate routes. Leads, deals, follow-ups, and campaigns remain outside the active workspace and are excluded from normal snapshot loading.

Public contact, lead, newsletter, and career forms can submit data through public insert policies. They do not create a CRM login, grant a role, or enter the company/client portal.

## Verification findings and follow-up boundary

- Confirmed source roles: `company_admin`, `company_member`, `client`.
- Confirmed portal routing: active client to `/client`; active company roles to `/company`.
- Confirmed pending/inactive login rejection after the access fix.
- Confirmed assigned-employee repository/RLS restrictions and employee-safe RPC response fields; hosted SQL verification confirms anonymous execution is denied for both employee mutation RPCs.
- Confirmed profiles and shared settings are administrator-only after the RBAC alignment changes.
- Confirmed finance records and private finance proofs are administrator-only; clients see only linked invoice information.
- Live Admin/Employee/Client browser testing is still required. The anonymous username-resolver grant remains until the updated website is deployed, and Supabase Auth leaked-password protection is still disabled.

Recommended live smoke sequence:

1. Sign in as admin; provision employee/client test logins, create a client-linked project, assign an employee, and configure settings.
2. Sign in as employee; verify only assigned projects and tickets are visible, update permitted operational fields, add an internal note, and upload a file.
3. Sign in as client; verify linked project/invoice visibility, create a ticket and external reply, and confirm company-only data remains inaccessible.
4. Attempt direct Supabase reads/writes for each forbidden boundary and record the RLS result.
