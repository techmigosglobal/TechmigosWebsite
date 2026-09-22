# TechMigos web application review

Review date: 2026-09-22
Scope: Astro frontend, browser CRM runtime, Supabase backend (migrations,
RLS, storage, Edge Functions), tooling and repository hygiene.
Evidence: source under `src/`, `scripts/`, `supabase/`, the migration set, the
GitHub workflow, and live read-only probes of the hosted project through the
Supabase CLI (`functions list`, `secrets list`, `gen types`) and the Storage,
PostgREST and Auth Admin APIs.

The application is a static Astro site that talks to Supabase directly from the
browser. Authorization lives in Postgres RLS; the browser repository
(`src/lib/crm/repository.js`) is a UX pre-check, not a security boundary. That
architecture is coherent and works, so the findings below are mostly
hardening, operability and clone-ability rather than a redesign demand.

## Severity 1 — fix soon

### 1.1 `supabase/config.toml` did not parse

`[functions.username-login]` carried four keys that belong to `[auth.email]`
(`secure_password_change`, `max_frequency`, `otp_length`, `otp_expiry`), and
`[inbucket]` is deprecated in CLI 2.x.

Impact: every Supabase CLI command failed with `failed to parse config`, so no
workflow could use `db push`, `db diff`, `db dump`, `gen types --local`, or
local development. Any future backend work starts with this blocker.

Status: fixed in this change — the four keys moved to `[auth.email]`,
`[inbucket]` became `[local_smtp]`, and `[functions.admin-users]` now states
`verify_jwt = true` explicitly.

### 1.2 Public forms are unthrottled

`contact`, `support`, the footer newsletter and the careers application write
straight to PostgREST from the browser. `src/lib/rateLimit.ts` is implemented
and never imported; `src/lib/csrf.ts` and `src/lib/csrfMiddleware.ts` are
implemented, never mounted, and the forms call a helper that returns a
placeholder token. The honeypot field is the only spam control.

Risk: bot spam inflates `contact_leads`/`newsletter_subscribers`, storage abuse
in `resumes` (anonymous insert up to 5 MiB), and uncontrolled PostgREST load
against a project-level quota.

Fix options, cheapest first: add CAPTCHA to the public forms and verify it in a
single Edge Function that performs the insert; or keep direct writes and add a
Vercel/Cloudflare rate-limit rule plus a scheduled cleanup job. Whichever
route is chosen, delete the CSRF and rate-limit modules or wire them — dead
security scaffolding reads as protection that is not there.

### 1.3 Authentication endpoints have no brute-force protection

`username-login` is deliberately deployed with `verify_jwt = false` and
performs password verification itself. It has neither throttling nor account
lockout, and `admin-users` relies only on GoTrue defaults.

Fix: per-IP and per-username counters (Edge Function + Postgres table, or
Supabase's auth rate limits), a login audit row, and a lockout threshold. The
function already avoids username enumeration, which is good — keep that
property when adding limits.

### 1.4 List reads are unbounded and silently truncate

`createCrmRepository().request()` issues
`select(...).order('created_at', { ascending: false })` with no range for every
generic resource, and the client portal overview fetches all projects,
invoices and tickets for the linked client in one go. PostgREST returns at most
`api.max_rows` rows (1000 in the local config).

Impact: past 1000 rows, CRM tables and portal lists lose rows with no error —
the worst kind of data bug, because the UI looks correct.

Fix: explicit `range()` pagination with a keyset cursor plus a "load more" /
virtualized table, and a hard `limit` in the repository contract. Add a test
that a >1000-row table round-trips.

## Severity 2 — operational risk

### 2.1 Migration history has drifted from the dashboard

`CODEBASE.md` records that several migrations were applied through the Supabase
dashboard, producing versions such as `20260918163410` that do not match the
local filenames (`20260918100000_tighten_ticket_message_insert_rls.sql`). The
remote history is therefore not reproducible from the repository, which blocks
clean restores, `supabase db push`, and disaster recovery.

Fix: stop applying migrations in the dashboard; capture the remote history
(`meta/migration-list.json` in the export bundle), then
`supabase migration repair --status applied <version>` for each drifted
version, and from then on apply only through the CLI in CI. The backend clone
kit now records the remote history whenever database credentials are supplied.

### 2.2 The project reference is hardcoded in seven places

`vercel.json` (env plus CSP `connect-src`), `src/layouts/BaseLayout.astro`
(preconnect), `.env.example`, `env.example.json`, `.env.local`,
`AGENTS.md`, and four scripts (`lead-management.mjs`,
`provision-portal-user.mjs`, `prepare-live-identities.mjs`,
`cleanup-live-identities.mjs`).

Impact: cloning to another project silently keeps the old backend in some
places and breaks the CSP in others.

Fix: read the URL from build-time env everywhere and derive `connect-src` from
it. `scripts/backend/update-frontend-ref.mjs` rewrites all seven locations in
one command for the interim.

### 2.3 Stale or unused modules and variables

- `src/db/supabase.js` creates a second Supabase client that nothing imports;
  `src/layouts/BaseLayout.astro` boots the real one.
- `src/lib/apiResponse.ts`, `src/lib/careerUploads.ts` (filesystem uploads on a
  static host), `data/leads.json`, `PublicPageRef/` and
  `Company's Operation and Management Screens.zip` are unused or historical.
- `PUBLIC_API_BASE_URL`, `CSRF_SECRET`, `MSG91_*`, `LEAD_NOTIFICATION_EMAIL`,
  `CAREER_UPLOAD_DIR` and `FEATURED_PROJECT_ORDER` are documented but not read
  by any active code path. Either implement lead notification (the env shape is
  already there) or remove the variables so operators do not configure
  something that does nothing.

### 2.4 Continuous integration only covers a weekly audit

`.github/workflows/weekly-seo-audit.yml` builds the site and audits
dependencies weekly. Nothing runs `npm test`, `npm run build`,
`npm run validate` or the E2E suite on push or pull request.

Fix: add a PR workflow that runs `npm ci`, `npm test`, `npm run build`,
`npm run validate`, `npm run security:audit`, and a Playwright job for the
credential-free specs. Six E2E specs are skipped without disposable `CRM_*`
identities, so a scheduled live job should generate them through the existing
`crm:prepare-live` script and tear them down afterwards.

### 2.5 Repository hygiene

`agent/` (761 tracked files), `.agents/` (191), `PublicPageRef/` (11), a 5.7 MB
zip, and a 1 KB `readme.txt` that is empty are all tracked. There is no root
`README.md`; `CODEBASE.md` is the only onboarding document and is already stale
in places: it describes Tailwind CSS 3.4.19 with PostCSS and Autoprefixer,
while `package.json` pins Tailwind 4.3.3 through `@tailwindcss/vite`; and it
documents modules under `src/features/operations/` that are compatibility
wrappers only.

Fix: move agent tooling out of the product repository, delete the zip and dead
directories, add a real README, and treat `CODEBASE.md` as generated output
that a script refreshes.

## Severity 3 — design and DX

### 3.1 Almost everything runs in the browser

`src/scripts/crm-workspace.js` (1,180 lines) plus 40 modules under
`src/lib/crm/features/` ship to every authenticated user, and every privileged
operation is a browser-initiated PostgREST or Edge Function call. This is
workable given RLS, but it means: no server-side validation, invoice/user
provisioning logic reachable from a hostile client, no way to keep long-running
work off the user's browser, and a large JS payload for a business tool.

Recommended direction, incremental: move the multi-step mutations
(`save_invoice_with_items` callers, user provisioning, upload signing, record
purge) behind Edge Functions that re-check the caller role, keep RLS as the
authority, and let the browser call thin, typed wrappers. An Astro SSR
adapter on Vercel would also enable real rate limiting and CSRF for the public
forms.

### 3.2 The repository's internal HTTP contract is misleading

`request()` parses paths that look like `/api/portal/...` but no such HTTP
endpoint exists. New contributors reasonably assume a server. Consider renaming
to resource methods and keeping one typed client per resource, or introduce
real Astro API routes so the contract is honest.

### 3.3 Field-level policy lives in three places

Resource allowlists, role field trimming (`EMPLOYEE_PROJECT_FIELDS`,
`CLIENT_INVOICE_FIELDS`, …) and RLS policies must stay in sync by hand.
The September migrations did this well, but nothing enforces it. Add a test
that compares the repository's allowed fields against the columns RLS actually
exposes for each role, so drift fails in CI.

### 3.4 Data quality issues

- The contact form renders a phone input and never sends it; sales lose the
  number. Include `phone` in the payload or drop the field.
- `blog` and `careers` collections have no entries, so the site builds with two
  empty collections and indexable empty pages. Populate, hide, or make the
  routes conditionally generated.
- `crm_leads`, `crm_deals`, `crm_followups`, `crm_campaigns` remain in the
  database with no UI and no RLS access. Decide: drop them in a migration, or
  document them as archived.

### 3.5 Accessibility and front-end polish

The marketing pages pass the site validator and use reduced-motion guards,
which is good. Two gaps remain: the custom cursor and magnetic/tilt effects are
attached to `document.querySelectorAll('a, button, input, …')` at load, so
dynamically rendered CRM/public elements never receive the listeners; and the
invoice print popup is built from `innerHTML` snapshots, which should be
reviewed whenever invoice branding fields change, because that is the one place
where user data enters a document without the repository's escaping helpers.
