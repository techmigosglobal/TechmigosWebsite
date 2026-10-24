# Techmigos Finance frontend

The website's compact top-right Login link opens /login. Firebase Authentication
opens /finance for authorized administrators and team members. The original
Techmigos_Finance_Standalone.html is rendered as the page itself, preserving the
accepted interface, calculations, reports, CSV, monthly billing, receipts and
backup/restore workflows.

Records live in Firebase project techmigos-279f6. The browser export was migrated
with stable IDs: 18 transactions, 5 invoices, 2 projects and 2 teams. Neither
credentials nor the private starter ledger are included in static assets.

Teams manages team names, member login credentials and project assignments.
Members receive only their assigned team's projects and payout records. Payout
percentages remain in project shares. Server validation and rules enforce access.
Administrators assigned to a team appear in its member list with an Administrator
label. Their team membership does not restrict their access to finance records.
Teams cannot change administrator credentials or downgrade their role.

Every new project requires a Fixed project value. Project cards show that value,
and the team's entitlement is its configured percentage of that value. Editing
the value recalculates entitlement but never creates cash. Received cash, expenses
and payouts remain actual ledger amounts. Recurring invoice receipts belong
entirely to the company and never change project value or team entitlement.
The same rule applies to every future project, not just the initial two.

Monthly invoices are automatically company-only. For manual maintenance/service
invoices, select Company-only service income in the invoice form. Existing imports
are not guessed from their descriptions. Receipts retain their company-only flag
if their invoice is later deleted. Project Details and Reports show company-only
income separately; expected company net is the fixed company project share plus
company-only receipts minus recorded project expenses. Actual cash remains separate.

In a project's Overview, click a row in Team payout breakdown to show that team's
transactions in the adjacent panel. Team-name buttons support Enter and Space.
The preview includes only records assigned to that team in the current project;
an empty message identifies teams with no records. Clear the team filter or click
the selected team again to restore recent project transactions. Record payout
still opens its own form, and transaction rows still open the receipt inspector.

Proofs are stored privately in Firebase Storage. Images, PDFs, audio and video
use the browser's native viewers; unsupported formats remain downloadable.
Each file can be up to 25 MiB. Full backups include proof bytes.

## Invoice customization and printing

Invoices → Project templates opens independent settings for each project.
Business and client information, terms, UPI payment destination, logo and
signature are editable. PNG/JPEG uploads are resized and saved privately inside
the project's validated template. Templates are included in full backups.

Open any invoice to preview the TM_INV21-1 reference layout. Services & notes
edits individual service rows (description, quantity, unit and rate). Saving
recalculates that invoice's total; received cash changes only through receipts.
The ordinary Edit invoice flow still edits its metadata and amount. Changing
its description/amount replaces custom rows with a single matching service.
Choosing Paid creates a linked receipt for the remaining balance, updating the
project's Received total and cash in one server save. Fixed team entitlements do
not change. Existing
partial/full receipts are counted once. Later invoice status is derived from the
receipts, so editing or deleting a receipt can reopen the balance. Other statuses
and service edits do not automatically create income.

Preview, Download PDF and Print use one shared landscape renderer. It produces
crisp 3× image pages, supports rupee and Unicode text, and paginates services,
notes and terms. PDF pages are A4 landscape; their text is rasterized. The
preview also provides an accessible text summary. The QR uses the current
remaining balance; paid invoices omit the payment request. Print opens the
browser's printer chooser. It requires pop-ups; the downloaded PDF is a fallback.

Tap to pay in the PDF uses an HTTPS link to `/pay`; the QR encodes the UPI intent
directly. The public payment page supports Open UPI app, QR and copying the UPI
ID without requiring a finance login. It never verifies or marks a payment paid.
Details are kept in the URL fragment rather than HTTP query logs. PDF links use
PUBLIC_SITE_URL (default https://www.techmigos.com); emulator tests use their
local origin. Deploy the updated website before sharing new payment links.

## Development and verification

Run npm ci and npm run dev. Public Firebase web configuration is read from
.env.local. Do not use test credentials or fixtures against the live project.

npm test checks domain and existing repository tests. npm run test:finance
starts isolated demo Firebase emulators and a separate frontend build on port
4325, then tests authentication, ledger CRUD, receipts, plans, reports, backup,
proof formats, Teams, access isolation, templates, PDF and printing. It requires
Firebase CLI and Java 21. npm run build, npx tsc --noEmit and npm run validate
check the static site.

See finance-firebase.md for server collections, migration and deployment.
The Firebase backend is deployed; the public website has not been redeployed.
