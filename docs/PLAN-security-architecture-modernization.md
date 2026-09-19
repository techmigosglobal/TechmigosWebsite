# TechMigos Website: Security and Architecture Modernization

Status: Workspace implementation and live acceptance complete; remaining provider and database-maintenance observations are explicitly accepted or deferred
Date: 2026-09-19
Scope: Astro website, authenticated CRM/operations UI, dependency supply chain, local validation

## Outcome

Modernize the existing Astro/Supabase application without a rewrite. The result has a current, reproducible dependency graph with the latest `npm audit --audit-level=low` reporting zero vulnerabilities, no known advisories in the independent OSV lockfile scan, one navigation/icon/component contract for the CRM, safer reusable authentication and management UI primitives, and passing build, unit, validation, and full live browser gates.

## Guardrails and assumptions

- Preserve Supabase schema, migrations, RLS, Finance calculations, repository contracts, and privileged `admin-users` behavior unless a failing compatibility check proves a change is required.
- Preserve live-data boundaries. Do not reintroduce runtime mock/demo records into authenticated company pages.
- Keep Astro static output and Vercel deployment behavior.
- Prefer existing Astro/CSS primitives and the existing Lucide/custom icon approach. Do not add Bootstrap merely because it is available; a second global design system would increase CSS and bundle duplication. Reconsider only if an existing component requirement cannot be met without it.
- Upgrade packages in a compatible sequence. Treat major upgrades (Astro 7 and Tailwind 4) as migration work, not a blind `npm audit fix --force`.
- Do not add or modify environment credentials, service-role keys, generated build output, or user data. The existing `.env.local` is retained unchanged at the repository owner's direction; its current contents are limited to public Supabase configuration.

## Current evidence

- `package.json` now declares Astro 7.3.3, Tailwind CSS 4.3.3 with the official Vite plugin, Sharp 0.35.4, Supabase 2.116.0, Chart.js 4.5.1, and pinned test/type tooling. Tailwind's existing JS theme and utility plugin remain loaded through the explicit compatibility config; scoped `@apply` pages use `@reference`.
- The supported Node runtime is pinned by policy to `>=22.12.0`, matching Astro 7's compiler requirements; the weekly site/security workflow uses Node 22. Tailwind's v4 browser floor is Safari 16.4+, Chrome 111+, and Firefox 128+.
- The package manifest and lockfile are present and pinned. A fresh `npm run security:audit` completed successfully on 2026-09-19 and reported zero vulnerabilities. Earlier retries that day returned HTTP 400 from npm 10's retiring quick endpoint and HTTP 503 from npm 11's bulk endpoint; the service recovered. `npm run security:osv` independently checked all 464 unique locked npm package versions and found no known advisories; this supplements rather than replaces npm audit.
- Live verification used the operator-provided administrator account and temporary namespaced employee/client identities. Disposable profiles were deactivated, the linked test client was marked inactive, and SQL confirmed there are no linked test projects, invoices, tickets, or finance rows. No credential values belong in source control or this document.
- Read-only inspection confirms `.env.local` is present on the public GitHub default branch and locally, and is byte-for-byte unchanged from `HEAD`; it contains only `PUBLIC_SUPABASE_URL` and a publishable Supabase key, with no service-role key or password variable. Per the repository owner's explicit direction, keep the file in place; no deletion or history rewrite is planned.
- The installed dependency graph and local runtime gates have been rerun after the upgrade.
- `CrmLayout.astro` is now a thin compatibility shell containing layout, navigation, modal regions, status/loading boundaries, and the page slot. The bundled company controller lives in `src/scripts/crm-workspace.js`, and the client portal controller lives in `src/scripts/client-portal.js`; both use the shared repository/store boundary. The global CRM stylesheet lives in `src/styles/crm-shell.css`. Dashboard, Projects, Files, Support, Analytics, Reports, report data definitions, People/User Management, and Settings page renderers live in `src/lib/crm/features/*.js` behind explicit context adapters. CRM actions, finance controls, report controls, project files, user/client/employee controls, modal create/edit submissions, drawer controls, ledger keyboard navigation, and linked-form synchronization use one root-delegated boundary. One-shot image load/error handlers and canvas/signature state remain local because they close over renderer state.
- Company and client invoice print/preview output now uses the escaped shared renderer in `src/lib/crm/invoiceHtml.js`; totals, balances, branding, payment links, line items, and unconfigured-payment states are no longer duplicated between portal controllers.
- `src/lib/crm/routePolicy.js` is the canonical route contract; `src/lib/crmNav.ts` derives the server-rendered navigation from it, `src/features/operations/data/nav.ts` remains a compatibility re-export, and CRM chrome uses `src/components/crm/Icon.astro`.
- The obsolete runtime API/CSRF stubs (`techmigosApiFetch`, `techmigosApiUrl`, `techmigosGetCsrfToken`) were reference-scanned and removed; active public forms use their actual Supabase submission paths.
- `BaseLayout.astro` now selects an Astro-processed lightweight auth runtime for public/auth pages and the repository/Chart runtime only for the company workspace and client portal; generated build assets were inspected to verify both boundaries are emitted.
- `src/pages/login.astro` owns the bespoke login panel; email sign-in remains direct, while username sign-in now uses the deployed `username-login` Edge Function and returns session tokens without exposing the resolved account email to the browser.
- The hosted `admin-users` Edge Function is deployed at version 11 with JWT verification, the checked-in Supabase JS version, request-aware CORS allowlisting, invitation redirect handling, forced pending invitation status, and the initial-password-change operation used by `/change-password`.
- Generic company record actions now live in `src/lib/crm/features/recordActions.js`; client project, invoice, ticket, KPI, and conversation rendering uses DOM construction/text nodes for untrusted values. Browser fragments that still require templates pass through `src/lib/crm/safeMarkup.js`; Finance presentation is loaded from `src/styles/finance.css`, so Finance fragments also use the shared sanitizer boundary.
- Project-drive uploads share one MIME allowlist across repository validation, `crm_project_files` insert RLS, the private `project-files` bucket, and Storage access. The hosted upload policy checks authenticated project-path access while the bucket enforces MIME/50 MB limits and the CRM file-row policy validates persisted metadata; the live Admin→Employee→Client delivery journey passed.
- Existing automated gates are `npm test`, `npm run test:db:invoice-ledger`, `npm run build`, `npm run validate`, `npx astro check`, `npm run test:e2e`, and the required-identity `npm run test:e2e:live` gate; Finance/RBAC/workspace contract tests are in `test/crm-rbac-finance.test.js` and `test/crm-workspace.test.js`.
- Tailwind visual regression was checked before and after the migration on `/`, `/login`, `/portfolio`, `/blog`, and `/careers` at 320px, 768px, and 1440px; all 15 route/viewport combinations reported no horizontal overflow and side-by-side screenshots retained the existing layout.

## Workstreams

## Implementation status

- [x] M0 baseline: clean install completed; pre-change npm audit recorded at 18 findings; baseline tests/build passed.
- [x] M1 supply chain: Astro 7.3.3, Sharp 0.35.4, Supabase 2.116.0, Tailwind 4.3.3 with `@tailwindcss/vite`, Playwright 1.63.0, and typed content configuration are pinned. Tailwind's JS theme/plugin compatibility is preserved, the obsolete PostCSS/Autoprefixer integration is removed, and Node 22.12+ is declared. The latest `npm audit --audit-level=low` reports zero vulnerabilities; OSV also found no advisories across 464 locked package versions.
- [x] M1 deployment input: `.vercelignore` now keeps `data/site-content.json`, which the prerendered homepage, portfolio pages, and sitemap load at build time, while continuing to exclude `data/leads.json` and other local data. A regression check protects this allowlist.
- [x] M2 CRM contracts: canonical navigation, icon registry, modal, button, and icon-button primitives are active; legacy imports remain compatibility wrappers.
- [x] M3 auth/management slice: reset/change-password fields and statuses are shared; CRM overlay/topbar actions use canonical controls; Supabase Auth, repository, and RLS contracts are aligned for first-login, recovery, invitation completion, and deactivation.
- [x] M4 available gates: latest `npm test` 126/126; `npm run validate` passed for 28 HTML pages after a 29-route build; `npx astro check` completed with 0 errors, warnings, or hints; `git diff --check`; repository security scan reported zero findings; `npm run security:audit` reported zero vulnerabilities; and OSV found no known advisories in all 464 unique locked npm package versions. The complete live Playwright suite passed 17/17, including role access, project delivery/private files, ticket conversation visibility, invoice/payment/report consistency, Settings persistence with restoration, and User Management provisioning/first-login/deactivation. The Antigravity checklist passed its 5 available core checks; its optional UX script is absent. The invoice-ledger PostgreSQL container regression passed in an earlier run; its latest rerun could not start because the local Docker daemon/socket was unavailable.
- [x] M5 workspace foundation: canonical nine-route policy (including the `/company/support` route), role-scoped workspace store, assigned employee ticket workflow, employee-safe analytics/report views, atomic audited cleanup RPC, client portal store reuse, private invoice assets, root-delegated CRM actions, and legacy operations shell/mock retirement are implemented. The inactive project-drive “Project actions” button has been removed so the live interface exposes no no-op control there.
- [x] M5 shell extraction increment: report definitions and role/date-scoped report calculations are isolated in `src/lib/crm/features/reportData.js`, report refresh/export/print dispatch and CSV/PDF delivery are isolated in `src/lib/crm/features/reportExportRuntime.js`, ticket detail/view actions are isolated in `src/lib/crm/features/supportRuntime.js`, generic record actions are isolated in `src/lib/crm/features/recordActions.js`, shared session/permission/finance selectors are isolated in `src/lib/crm/features/workspaceContext.js`, finance sheet normalization/filtering now uses the shared `selectFinanceSheetRows` domain selector in `src/lib/crm/finance.js`, invoice preview/print/detail and hover behavior are isolated in `src/lib/crm/features/invoicePreviewRuntime.js`, invoice builder persistence/assets/signatures and scoped click actions are isolated in `src/lib/crm/features/invoiceBuilderRuntime.js`, Finance ledger validation and persistence are isolated in `src/lib/crm/features/financeLedgerRuntime.js`, Finance click and sheet actions are isolated in `src/lib/crm/features/financeActionsRuntime.js`, project list/detail interactions are isolated in `src/lib/crm/features/projectActionsRuntime.js`, People record selection shares its feature boundary in `src/lib/crm/features/people.js`, private project-drive interactions are isolated in `src/lib/crm/features/filesRuntime.js`, the action selector/root-scoping/listener lifecycle is isolated in `src/lib/crm/features/delegatedEvents.js`, delegated CRM form mutations are isolated in `src/lib/crm/features/formEvents.js`, cache-first/live-authoritative workspace hydration is isolated in `src/lib/crm/features/workspaceDataRuntime.js` with unit coverage for stale, bypass, success, and failure states, and shared dialog dismissals plus shell/settings/user-navigation actions are isolated in `dialogUtils.js` and `workspaceNavigationActions.js`; client portal list/conversation rendering uses DOM construction. Empty shell rendering and autosave-binding no-ops have been removed; remaining controller responsibilities are cross-feature event coordination and compatibility adapters.
- [x] M5 security hardening: Supabase and Chart.js are bundled from lockfile-managed packages, admin-user CORS uses an explicit allowlist, and Vercel declares HSTS alongside the existing baseline security headers.
- [x] M6 live browser gates: the full live Playwright suite passed 17/17. It covers all nine protected company routes, Admin/Employee/Client access boundaries, login/recovery, responsive navigation, project delivery and private files, client/admin support with internal-note privacy, invoice/payment proof/client preview/report consistency, Settings save/reload/restore, and User Management first-login/deactivation.
- [x] M7 hosted policy hardening: the additive employee support, audited cleanup, private invoice asset, function ACL, RLS init-plan, duplicate-index, profile-deactivation, username-login, project-file-storage, private-schema helper-isolation, policy-consolidation, relationship, ticket-write, unused-demo-table, and private-resume-storage protection semantics are live. Employees may read conversation messages on assigned tickets but may only insert internal notes; clients may read external messages for their linked tickets. The Supabase connector confirms the final write/audit migrations plus `protect_unused_todos` at dashboard-generated version `20260918180247` and `private_resume_storage_constraints` at `20260918180514`; the linked CLI still shows filename/version drift for earlier dashboard-applied migrations, so history reconciliation remains a release-maintenance follow-up rather than a reason to reapply the SQL.
- [x] M7 project Storage upload alignment: hosted migration `20260919120328` (`storage_upload_metadata_rls_alignment`) keeps `project-files` private, caps objects at 50 MiB, enforces the MIME allowlist at the bucket boundary, and restricts object inserts to authenticated users with assigned project-path access. A live three-role project upload workflow passed after application.
- [x] M7 invoice-save RPC alignment: hosted migration `20260919165958` (`secure_invoice_save_rpc`) checks the isolated `private.is_company_admin()` helper, keeps invoice and item writes atomic, revokes execution from `public` and `anon`, and grants it to `authenticated`. Hosted ACL inspection and the full live invoice lifecycle passed.
- [x] M7 hosted runtime alignment: `admin-users` Edge Function version 11 was deployed with JWT verification and explicit CORS; hosted verification confirms `OPTIONS` returns 200 with the production allowlist origin, unauthenticated POST returns 401, wildcard CORS is absent, the invitation redirect is configured, and the initial-password-change operation is present. `username-login` Edge Function version 1 is active and is called by the current login page; an Admin username-login smoke test passed after resolver ACL hardening.
- [x] M7 local workflow hardening: `20260918100000_tighten_ticket_message_insert_rls.sql` adds role-matched visibility/author checks for direct ticket-message writes, `20260918101000_tighten_client_ticket_insert_rls.sql` keeps direct client ticket writes linked to the caller's client/project and open/unassigned, and `20260918110000_audit_cleanup_selected_records.sql` keeps cleanup audit entries self-contained with actor, timestamp, reason, selected records, and deletion count. The repository also rejects generic client CRM collection access outside explicit portal workflows.
- [x] M7 response/storage hardening: `20260919100000_minimize_employee_rpc_responses.sql` is applied to the hosted project as migration `20260919051828`; employee project/ticket RPCs now return operational JSON shapes rather than full table rows. Follow-up hosted ACL migrations removed surviving anonymous RPC grants and narrowed finance-proof reads to administrators. Latest live SQL confirms all four CRM storage buckets are private, project-file access is assignment-gated, finance proofs and invoice assets are admin-only, and anonymous resume uploads are constrained by path, type, and size.
- [x] M7 live policy catalog review (read-only): current hosted `pg_policies` confirms RLS is enabled on all 13 core CRM tables. The live predicates keep finances/settings admin-only, scope client invoice/client/ticket/message rows by `client_id`, scope employee project/file/ticket/message visibility to assignments, restrict employee messages to internal visibility, and allow each authenticated user to read their own profile. This inspects policy definitions; it does not substitute for authenticated three-role request tests.
- [x] M7 invoice-ledger repair: PostgreSQL reproduced the legacy `ON CONFLICT` inference failure against the partial unique index. The additive fix was applied as hosted migration `20260919091813`; a follow-up ACL migration `20260919092348` revoked anonymous execution while retaining the authenticated grant. A hosted authenticated-role transaction verified sent-to-pending, paid-to-received, and cancelled ledger behavior; post-rollback checks found no test rows. This does not replace three-role browser tests.
- [x] M7 simulated authenticated write probe (transaction rolled back): Admin external reply succeeded; the assigned Employee created a project folder/file and internal note and updated an assigned ticket through `employee_update_ticket`. Employee external-message writes, unassigned file/ticket actions, and forbidden ticket fields were rejected. Client ticket creation and external replies succeeded; internal-message writes were rejected and foreign tickets remained invisible. A post-rollback aggregate found zero fixture rows. This exercises PostgreSQL roles/RLS with claims from existing profiles, not Auth API or browser sign-in.
- [x] M7 browser boundary hardening: Vercel now sends a restrictive Content-Security-Policy with same-origin defaults, no object embedding, same-origin framing, and an explicit Supabase API connection allowlist; the header is covered by a regression test.
- [x] M5 shell boundary: `CrmLayout.astro` is a thin layout/navigation/modal shell; `src/scripts/crm-workspace.js` is the tested composition root for cross-feature wiring and the single delegated event boundary, while feature renderers and behavior remain isolated under `src/lib/crm/features/`. Invoice print rendering is shared by company and client portals; project, support, file, people, report, finance, and invoice-builder workflows use their feature runtimes and injected repository adapters.
- [x] M7 isolated PostgreSQL invoice-ledger regression (historical run): `npm run test:db:invoice-ledger` reproduced the legacy partial-index conflict-target failure in a network-disabled throwaway PostgreSQL 16 container, applied the fix and ACL migrations locally, verified anon/authenticated function grants, and tested invoice insert, paid update, cancellation, single-row upsert, and an unrelated manual finance row. Hosted behavior was verified separately in a rollback-only authenticated-role transaction. The latest rerun could not launch because the Docker daemon was unavailable; see M4 for current gate status.
- [x] Follow-up: the final architecture review leaves `src/scripts/crm-workspace.js` as the tested composition root required to connect the shared state and one delegated event system. Dashboard, Projects, Files, Support, Finance, Analytics, Reports, People, Settings, data hydration, repository actions, modal workflows, exports, and project-drive behavior are in feature modules; further splitting the dispatcher would fragment cross-feature coordination rather than establish a cohesive owner.
- [x] Follow-up: the scheduled site/security workflow no longer calls the nonexistent `seo:audit` script or uploads a nonexistent report. It builds and validates the generated site, runs `npm audit`, then runs the independent OSV and source-security scans even if npm's audit endpoint fails. The workflow is read-only and its YAML/step contract is regression-tested.
- [x] Follow-up: migrated to Tailwind 4.3.3 and the official Vite plugin; preserved the existing custom theme/plugin, referenced global tokens from scoped style blocks, removed the obsolete PostCSS/Autoprefixer pipeline, and visually checked five public/auth routes at mobile, tablet, and desktop widths.
- [x] Follow-up: the configured live Admin/Employee/Client browser matrix and client/admin support lifecycle ran against Supabase and passed 13/13. A separate live project-delivery lifecycle passed 1/1, including private employee upload and client visibility boundaries. Temporary employee/client profiles were deactivated afterward; linked test CRM client rows were marked inactive, and scoped project/support fixtures were removed.
- [x] Follow-up: the live invoice/payment/report lifecycle passed end to end: an Admin created a linked paid invoice, its ledger totals matched, a private proof was uploaded and previewed, the linked Client saw the invoice without the private proof filename, and the date-scoped report plus CSV reflected the same total and zero balance. The browser test now loads ignored local Supabase configuration for exact fixture cleanup; the disposable accounts were deactivated and its test client retained inactive.
- [x] Follow-up: live Admin Settings tax-rate changes persisted through the UI, survived reload from Supabase, and were restored to the original value. The live User Management flow provisioned an Employee, verified one-time temporary credentials and mandatory first-login password change, then deactivated the test identity and confirmed login rejection.
- [x] Follow-up: remove the `/portfolio/hastkala` dynamic/static route conflict. Empty blog/careers collection warnings remain because those public content collections have no source entries.
- [x] Scope decision: leaked-password protection remains disabled by the repository owner's explicit instruction. This is an accepted Supabase Auth setting warning, not an npm dependency vulnerability; no plan upgrade or Auth setting change is authorized or planned ([password-security documentation](https://supabase.com/docs/guides/auth/password-security)).
- [x] Scope decision: retain the existing `.env.local` on the public default branch unchanged, as explicitly requested. Inspection found only the public Supabase URL and publishable key; it contains no service-role key or password. No history rewrite is warranted.
- [x] Follow-up: the `username-login` Edge Function is deployed (active v1, `verify_jwt=false` with in-function credential verification), and the current login page receives only a session instead of an account email. Hosted SQL confirms `anon` and `authenticated` cannot execute `get_email_by_username`; `service_role` retains access. The matching hosted migration name is recorded, though hosted/local migration version history still differs and must not be reconciled blindly.
- [x] Follow-up: standard Supabase Auth recovery sessions now update passwords through `auth.updateUser`; first-login provisioning continues through the guarded `admin-users` operation.
- [x] Follow-up: the disposable live-role provisioning command now uses Supabase Auth/PostgREST directly, loads ignored `.env.local` configuration, and no longer depends on the retired `/api/auth` or `/api/database` maintenance endpoints.
- [x] Follow-up: `npm run crm:prepare-live --silent` provisions namespaced employee/client accounts, completes their first-password transition, and exports the namespace plus credentials without writing them to source. `npm run crm:cleanup-live -- --namespace=codex-...` is dry-run by default; confirmed cleanup deactivates accounts and deletes only an unlinked test client through the audited RPC. Both commands expose help without requiring credentials.
- [x] Follow-up: invited users now complete the pending-to-active transition through the authenticated first-password-change operation; permanent passwords are never stored or returned by the invitation workflow.
- [x] Follow-up: isolate policy-only SECURITY DEFINER helpers in the non-exposed `private` schema. An unused `record_crm_last_login()` SECURITY DEFINER RPC had no application callers or trigger; it is now service-role-only in local and hosted migrations. Hosted SQL confirms `anon=false`, `authenticated=false`, `service_role=true`. The four remaining authenticated workflow RPCs are role/assignment checked and expose no anonymous execution.
- [x] Deferred maintenance: the hosted performance advisor reports 24 unused indexes on the low-volume project. These are informational, not dependency vulnerabilities; retain them until production query-usage evidence justifies a change.
- [x] Deferred maintenance: read-only comparison finds migration filename/version drift and duplicate hosted `revoke_anon_employee_rpc` and `_v2` entries for storage-policy finalization and helper isolation. `secure_anonymous_username_resolution` is present in hosted history under a dashboard-generated version different from its local filename; effective grants were verified directly. The targeted invoice-ledger fixes were applied as `20260919091813` and `20260919092348`; do not repair remaining history drift or run `db push` until the schema owner reviews the exact mapping.

### M0 — Baseline and dependency policy

Input: current package manifest, lockfile, config, tests, and audit output.

Output: reproducible install, documented supported Node/npm range, exact dependency update matrix, and a clean baseline report.

Verify:

- `npm ci` succeeds from the lockfile.
- `npm audit --audit-level=low` is captured before changes.
- `npm test`, `npm run build`, `npm run validate`, and `git diff --check` establish the starting state.

Rollback: preserve the pre-upgrade manifest and lockfile in Git; revert only dependency files if compatibility gates fail.

### M1 — Supply-chain upgrade and Tailwind integration

Input: M0 baseline.

Output: current Astro/Sharp/PostCSS/Vite/tar-related dependency graph, current Supabase/TypeScript/Playwright tooling, and a single supported Tailwind integration.

Implementation decisions:

- Remove unused `astro-icon` if source usage is absent; retain the local icon component or consolidate it around the already-used Lucide approach.
- Upgrade Astro and Sharp together, then run Astro checks/build.
- Upgrade Tailwind deliberately. If Tailwind 4 is compatible with the current class/config usage, migrate to the official Vite/PostCSS integration and preserve the existing token utilities. If it would require broad visual changes, keep the latest Tailwind 3 line for this increment and record Tailwind 4 as a separately gated follow-up rather than shipping a broken partial migration.
- Remove the broad `yaml` override once the updated graph no longer requires it; retain only justified overrides with a comment in the plan or package metadata.
- Add an explicit audit script and lockfile-only CI-friendly verification command.

Verify:

- `npm ci` succeeds twice from a clean lockfile.
- `npm audit --audit-level=low` returns zero findings, or any unfixable upstream finding is explicitly isolated with package/path/severity and no false zero claim.
- `npm run build`, `npm test`, and `npm run validate` pass.

Rollback: restore manifest/lockfile and the prior Tailwind integration if build output or CSS contracts regress.

### M2 — Canonical CRM design primitives and contracts

Input: current CRM chrome, legacy operations components, and `crmNavItems` contract.

Output: reusable, accessible Astro primitives for CRM buttons, icon buttons, cards, badges/status, field groups, tables, modal shells, empty/loading/error states, and a single navigation/icon registry.

Implementation decisions:

- Extract only stable repeated markup/styles first; do not split `CrmLayout.astro` mechanically into hundreds of files.
- Move the icon registry to a canonical `src/components/crm/Icon.astro` contract and update callers; preserve icon names used by existing nav/data renderers.
- Make `src/lib/crmNav.ts` the public CRM navigation export and keep the legacy import as a compatibility re-export until all callers are migrated.
- Keep data/state/rendering in browser modules where appropriate; Astro components should own structure and accessibility, not database policy.
- Use native accessible HTML plus existing design tokens; avoid Bootstrap unless a concrete missing primitive warrants it.

Verify:

- No duplicate nav arrays or parallel icon registries remain in active CRM code.
- Component-level source checks cover required labels, minimum target sizing, modal semantics, and focus-visible styles.
- Existing Finance/RBAC tests remain green.

Rollback: retain compatibility re-exports and migrate consumers in small commits so a primitive can be reverted independently.

### M3 — Login and management workflow consolidation

Input: login/reset/change-password pages, CRM shell, repository/permissions, and existing E2E selectors.

Output: shared auth form behavior and improved management operations using the canonical CRM primitives, while retaining Supabase Auth and backend-authoritative role checks.

Implementation decisions:

- Preserve the current email/password Supabase flow unless the audit explicitly requires a different credential model; do not invent a second auth system.
- Centralize safe form status/loading/error behavior and password visibility behavior without moving secrets into storage or logs.
- Improve management actions with consistent confirmation, disabled/loading states, accessible dialog semantics, and explicit destructive-action wording.
- Keep real repository data and permissions as the only source of authenticated management records.

Verify:

- Unauthenticated protected navigation still redirects to `/login`.
- Existing configured role-flow tests remain separate from static-source proof; absent credentials are reported as not tested.
- Login, reset, and change-password forms have labels, autocomplete, keyboard access, and no secret values in HTML or logs.

Rollback: revert only shared form/CRM primitive consumers while preserving auth API contracts.

### M4 — Focused QA, security, and delivery evidence

Input: M1–M3 changes.

Output: source, dependency, build, test, browser, and artifact evidence separated by gate.

Verify:

- `npm audit --audit-level=low`
- `npm test`
- `npm run build`
- `npm run validate`
- `npm run test:e2e` with configured credentials where available, followed by `npm run test:e2e:live` for the release gate
- `python3 .agents/scripts/checklist.py .` and focused security/UX scripts where compatible
- `git diff --check`, secret scan, and final `git status --short`

Report separately: dependency audit, static/build gates, unit/repository tests, browser/role tests, and any unavailable live Supabase or credential-dependent checks.

### Hosted Supabase verification — 2026-09-18

- Migration verification: the Supabase migration API lists the earlier hardening migrations under dashboard-generated versions with matching names, and confirms the final three live versions `20260918163410` (`tighten_ticket_message_insert_rls`), `20260918163422` (`tighten_client_ticket_insert_rls`), and `20260918163441` (`audit_cleanup_selected_records`). The CLI still displays local filename/version drift, so future migration operations must use the schema-owner-reviewed mapping rather than `db push --include-all`.
- Security advisor: remaining warnings are the intentional anonymous username resolver, five authenticated controlled SECURITY DEFINER RPCs, and the project-level leaked-password-protection setting.
- Performance advisor: auth RLS initialization-plan, duplicate-index, and multiple-permissive-policy findings are cleared. Remaining notice is 32 unused indexes on this low-volume project; removal requires production query-usage evidence. The later Storage policy-role migration was verified separately; no CRM or project-file policy is assigned to `public`.
- Vulnerability scanner: the focused application scan reports zero critical/high findings and zero secret findings; its remaining medium `innerHTML` matches are reviewed render paths that escape user-controlled values or insert fixed UI markup. The repository scanner now excludes embedded agent worktrees, recognizes `env(...)` substitutions as non-literal configuration, evaluates only the selected npm lockfile, and recognizes Astro/Vercel header configuration. Its output remains a review aid, while the deployed header contract is covered by source regression tests.
- Hosted anonymous probes against `crm_projects` and `crm_tickets` returned empty result sets, while the hosted policy query confirms the project-file Storage upload policy is `authenticated`-only; no unauthenticated CRM record or project-file listing was exposed.
- This distinction is deliberate: `npm audit --audit-level=low` is zero, but “zero vulnerabilities” does not mean that every Supabase advisor warning or project Auth setting has been eliminated.

### Hosted Supabase follow-up — 2026-09-19

- The current `/login` page calls `username-login`, which returns session tokens without returning the resolved account email. Hosted SQL confirms `get_email_by_username` is not executable by `anon` or `authenticated`; a live Admin username-login smoke test passed.
- The security advisor no longer reports the anonymous username resolver. It reports four authenticated workflow `SECURITY DEFINER` RPCs: assigned-employee project/ticket updates, admin-only confirmed-record cleanup, and admin-only project-member assignment. Their fixed `search_path`, grants (`anon=false`), and role/assignment/field checks were inspected. The unused last-login RPC was revoked from `anon` and `authenticated`; hosted SQL confirms it is service-role-only. Leaked-password protection remains disabled. The connected organization is on the Free plan; Supabase documents this control as Pro and above, so enabling it requires a plan upgrade and project Auth configuration. No billing change was made.
- The additive local migration `20260919180000_revoke_unused_last_login_rpc.sql` was applied to the hosted project as migration `20260919172849` through the Supabase migration service and verified by SQL privilege checks. No CRM rows were modified by that migration.
- The hosted migration history already contained `revoke_anon_employee_rpc` at `20260919051916`. An idempotent repeat was applied at `20260919070633`; SQL inspection before/after confirmed effective grants stayed `anon=false`, `authenticated=true`, `service_role=true` for both employee RPCs. The duplicate history row is recorded here; do not delete or rewrite migration history without schema-owner approval.
- `storage_upload_metadata_rls_alignment` was applied as hosted migration `20260919120328`. Read-only verification confirmed the `project-files` bucket is private with a 52,428,800-byte limit and the expected MIME allowlist, and its INSERT policy targets `authenticated` with the assigned-project path helper.
- `secure_invoice_save_rpc` was applied as hosted migration `20260919165958`. Hosted ACL inspection confirmed anonymous execution is false and authenticated execution is true, with the RPC checking `private.is_company_admin()`. The live invoice lifecycle passed after this alignment, including proof privacy and report/CSV parity; its exact invoice, ledger row, and proof object were cleaned up, both temporary user profiles were deactivated, and the linked disposable CRM client was marked inactive.
- The hosted performance advisor currently reports 24 unused indexes. No indexes were removed because production query-usage evidence is required.
- The complete live Admin/Employee/Client Playwright suite passed 17/17. It included project delivery, ticket visibility, invoice/payment/report, settings persistence/restoration, and user provisioning/deactivation. Afterward, the two namespaced role profiles and three recent UI-provisioned Employee profiles were inactive; the linked test client was inactive; SQL confirmed zero linked projects, invoices, tickets, or finance rows.
- `npm run security:osv` checked 464 unique locked npm package versions with no known advisories. After earlier registry failures, a fresh `npm run security:audit` succeeded and reported zero vulnerabilities.
- The latest local invoice-ledger container test attempt could not start because Docker was unavailable. Earlier isolated-container and hosted rollback-only evidence remains documented above, but the local container gate should be rerun when Docker is available.

## Dependency graph

```text
M0 baseline
  -> M1 dependency/Tailwind gates
  -> M2 canonical CRM primitives
  -> M3 login/management consumers
  -> M4 full verification
```

M2 and M3 may be developed in parallel only after the navigation/icon contract is fixed; changes to the same consumer files remain serial.

## Queries / decisions to confirm if scope changes

1. The current source and tests use email/password Supabase Auth. This plan preserves that contract. If username/PIN or passwordless access is intended for this website, that is a separate auth migration requiring explicit confirmation and backend/RLS review.
2. “Zero vulnerabilities” means zero findings from the current npm registry audit after a clean install; it cannot honestly include vulnerabilities with no upstream patch. The implementation will fail the goal rather than hide such findings.
3. Bootstrap is not added by default because Tailwind and existing CRM CSS already provide the required primitives; adding both would increase duplicate styles and maintenance cost. It can be added later for a specific component gap.

## Completion criteria

- Plan is checked in at `docs/PLAN-security-architecture-modernization.md`.
- Dependency graph is current and reproducible, with npm audit at zero or an explicit upstream-blocked exception.
- Repeated CRM navigation/icon/form/modal patterns use canonical components/contracts.
- Finance calculations, repository contracts, RLS migrations, and live-data boundaries remain intact.
- Build, tests, validation, and available browser checks pass, with evidence classified by gate.
