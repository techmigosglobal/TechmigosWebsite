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
| `finance_projects` | Project details, fixed `projectValue`, shares, optional `teamIds`, and private `invoiceTemplate` settings |
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
changes and team views atomically. Stale revisions are rejected. Invoice totals
and cash stay separate. Per the 2026-10-25 instruction, team entitlements now use
fixed project values, not collected income. `functions/project-finance.js` is the
shared calculation owner for browser metrics and server projections.

New project saves require a positive `projectValue` with at most two decimals.
Missing values on legacy projects are not guessed from receipts. Older clients
and backups preserve already stored values if the field is omitted. Recurring
invoices (monthly-plan ID or Recurring source) and explicitly `companyOnly`
service invoices allocate their receipts entirely to company income. The backend
copies this classification onto linked income records for durable accounting.
Changing the fixed project value never creates income or changes past payouts.

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

Only Vinay's active administrator account (`vinay@techmigos.com`, checked against
both Firebase Auth and the finance profile) can select **Approve & add proof**
for a transaction with no attached proofs. The approval form requires the reason
for the missing receipt and a saved/uploaded signature. It reuses saved invoice
signatures where available; a round blue Techmigos stamp is the default when no
stamp image has been saved. Approval images are remembered in optional
`settings.approvalImages`, editable only by Vinay.

`prepareApproval` creates the server-owned transaction snapshot, approver and
timestamp. `finishApproval` verifies the workspace revision and unchanged missing
proof status, then atomically attaches the PDF, updates team views and records
its SHA-256 hash in the private `finance_approval_audit` collection. Drafts expire
after 15 minutes. This is an internal approval voucher, explicitly labelled as
having no original receipt; it does not certify bank settlement. Approved PDFs
cannot be overwritten through Storage. Only Vinay may remove a voucher, and
transaction details cannot change while its approval remains attached.

Expenses can optionally carry `projectAllocations: [{projectId, amount}]` with
two or more distinct existing projects, positive two-decimal shares and an exact
sum equal to the expense total. Their legacy `projectId` is blank. The form splits
equally by default, distributes any remaining paise deterministically, and allows
custom amounts. A shared expense remains one ledger/proof record. Company totals
count its full amount once; each project uses only its allocated amount in its
transactions, expenses and company balance. Pending expenses still do not reduce
cash. CSV exports include allocation details; JSON backups retain the shares.

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
- `node scripts/firebase/assign-admin-teams.mjs` previews the requested founder
  memberships. `--apply` assigns Vinay to Developer's Team and Vishal to
  Operation's Team after checking their existing active administrator profiles
  against Firebase Authentication. It preserves roles and credentials, backs up
  the profiles privately, and verifies both assignments after the atomic update.
- `node scripts/firebase/reconcile-paid-invoices.mjs` previews imported Paid
  invoices missing linked receipts; `--apply` adds only their unpaid balances
  and rebuilds team projections in one revision. A private pre-change backup is
  saved locally. Historical receipts use invoice issue dates because actual
  payment dates were not supplied; admins can correct those dates in the ledger.
  Repeating the command adds no duplicates. New Paid saves settle on the current
  date in Asia/Kolkata, and save responses include the normalized workspace.
- `node scripts/firebase/set-fixed-project-values.mjs --values-file <private-json>`
  previews explicit `{id,name,value}` project entries from a local private file;
  `--apply` saves those values and rebuilds private team projections atomically. It backs up
  the workspace privately and verifies transaction/invoice hashes remain equal.
  Future projects obtain their values from the required project-creation field.
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
