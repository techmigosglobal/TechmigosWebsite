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

Preview, Download PDF and Print use one shared landscape renderer. It produces
crisp 3× image pages, supports rupee and Unicode text, and paginates services,
notes and terms. PDF pages are A4 landscape; their text is rasterized. The
preview also provides an accessible text summary. The QR uses the current
remaining balance; paid invoices omit the payment request. Print opens the
browser's printer chooser. It requires pop-ups; the downloaded PDF is a fallback.

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
