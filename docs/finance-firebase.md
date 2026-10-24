# Finance backend and Teams

Firebase project `techmigos-279f6` (number `220055400039`) uses the existing
Standard Firestore database in `asia-south1`. The `finance` functions codebase
exports the authenticated callable `financeApi` in the same region.

## Data and migration

The browser workspace was exported before migration. Its 18 transactions,
5 invoices, 2 projects, 2 teams, business settings and empty monthly-plan list
were imported using their original IDs. There were no proof files in that
workspace. Re-running the migration verified the same counts without duplicates.
Private source backups remain in Downloads and the gitignored `.backend-export`.
Financial starter data is no longer included in the public HTML or JS bundle.

| Collection | Purpose |
|---|---|
| `finance_transactions` | Original income, expenses and salary records |
| `finance_projects` | Project details, shares, optional `teamIds`, and private `invoiceTemplate` settings |
| `finance_teams` | Stable team IDs and customizable names |
| `finance_invoices` / `finance_plans` | Invoices and recurring billing plans |
| `finance_settings/main` | Invoice business profile |
| `finance_workspace/main` | Revision for real-time updates and concurrent-save checks |
| `finance_users` | Firebase UID, member name/email, role, team, active status and session cutoff |
| `finance_team_views` | Server-built team project/payout views without the company ledger |
| `finance_proofs` | File metadata and server-computed permitted teams |
| `finance_initial/main` | Restricted initial snapshot for the existing reset feature |

Both original projects now have independent templates initialized from the
user's `TM_INV21-1.pdf`. This adds business/client fields, payment details and
the signature image without changing any transaction, invoice amount or ID.
The source PDF is not published. Existing template edits are preserved when
`scripts/firebase/initialize-invoice-templates.mjs` is rerun.

Invoices may include 1–24 service items. The backend checks descriptions,
quantities, rates and the exact total. Template images accept only bounded
embedded PNG/JPEG data; external image URLs are rejected. See
`docs/finance-frontend.md` for preview, print and PDF behavior.

Mutations run on the backend. Each save validates record fields, dates, amounts,
IDs, relationships and shares, checks the expected revision, and commits record
changes and team views atomically. Stale revisions are rejected. The original
financial calculations are retained, including separate invoice/cash accounting.

## Teams and credentials

Vinay and Vishal use Firebase Authentication and have administrator profiles.
Their supplied passwords were used only during bootstrap and are not stored in
the repository, Firestore, or application storage. Emulator tests use different,
synthetic passwords. Password values entered in Teams go to the authenticated
backend and Firebase Auth; saved passwords cannot be displayed.

Teams supports rename, member creation/editing, email changes, password changes,
enable/disable and reassignment. `Assign projects` manages access independently
of payout percentages. Existing share rules also assign that project to the team.
Renames resolve through stable IDs in project shares, payouts and selectors.
Teams with members must have those members reassigned before removal.

Members see only their assigned team's project details and payouts. They cannot
read raw company records, list other profiles, create users or change financial
records. Disabling a member denies access using the profile as well as Firebase
Auth and clears the open member workspace. Administrators configure assignments;
the migration does not invent team shares or allocate previously unassigned pay.

## Proof files

Proofs use protected Storage paths `finance/proofs/{id}/file`, up to 25 MiB per
file. Images and PDFs preview inline; browser-supported audio/video use native
players. Other formats remain downloadable. SVGs render as images and arbitrary
documents never execute inside an iframe or an app-origin tab. Unsupported image
or media codecs can be downloaded for use with a compatible application.

Downloads use authenticated Storage reads rather than persistent public download
tokens. Member access is computed from their assigned team's salary/payout
references. The backend service account's added object-management permission is
restricted to the finance proof path. Existing public resume upload rules remain.

## Validation and operations

- `npm test`: domain validation, safe team views, assignments and existing tests.
- `npm run test:finance`: isolated demo Auth/Firestore/Functions/Storage emulators,
  a separate `.tmp-finance-dist` build on port 4325, and browser/security tests.
  Test fixtures never write to the live project. Java 21 and Firebase CLI are needed.
- `npm run build`, `npx tsc --noEmit`, `node scripts/validate-site.mjs`.
- `firebase deploy --only functions:finance,firestore:rules,storage --project techmigos-279f6`.
  On Windows, slow first-time dependency loading may require setting
  `FUNCTIONS_DISCOVERY_TIMEOUT=120` for the CLI process. Emulator tests set it.
- `scripts/firebase/migrate-finance.mjs <full-backup.json>` is idempotent and
  refuses to replace a different migration. Bootstrap passwords must be supplied
  via environment variables. CLI credentials are handled privately and temporary
  ADC material is removed after execution.
- `scripts/firebase/verify-live.mjs <original-backup.json>` verifies actual Auth,
  exact imported data, callable authorization, member isolation, proof bytes,
  protected Storage reads and disabled sessions. Its temporary test account and
  proof are removed in cleanup. Reports contain status only, never credentials.

Security rules default to deny; browser writes to finance collections are denied
even for administrators. Schema validators run on all server creates/updates.
The original anonymous contact/newsletter/career form rules remain unchanged.
Rules are a reviewed implementation prototype: review and verify authorization
again before expanding the app's audience or adding new collections/actions.

The public website has not been redeployed by this work; the local frontend is
connected to the deployed Firebase backend. Existing empty blog/careers build
warnings are unrelated to finance.
