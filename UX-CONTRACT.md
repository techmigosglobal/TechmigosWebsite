# Finance frontend behavior

Scope: the supplied finance HTML, its login entry, and the website Login link.
Firebase integration and team-restricted member accounts are now authorized.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | login.astro; standalone field/selectField and handleForm | Required fields and original finance constraints | Login, create, edit | finance E2E |
| Select/Listbox | standalone selectField and native select controls | Supplied HTML | Native | finance E2E |
| Table Selection | standalone txTable/shareSection/actionHandler | Original transaction inspector and project team preview | Single transaction / project-scoped team filter | finance E2E |
| Date | standalone native date inputs and formatters | Supplied HTML dates and INR amounts | Native | finance E2E |
| Scrollbar | standalone stylesheet; marketing global.css | Existing document scrolling and table overflow | Native | Narrow viewport E2E |
| Toast | standalone toast | Escaped status message in toastHost | Existing finance notifications | finance E2E |
| CRUD | standalone handleForm/listDelete/refresh plus finance-runtime.js | Validated backend and Firestore revisions | Original list/detail flows | finance E2E |
| Authentication | src/scripts/finance-runtime.js | Firebase Auth and server-only finance_users profiles | Admin / assigned-team member | finance E2E |
| Invoice documents | invoice-ui.js and invoice-document.js | Project invoiceTemplate, invoice items, linked receipts | Preview / A4 landscape print / PDF | invoice E2E and domain tests |

- `/login` validates required email and password, supports password reveal,
  handles incorrect credentials inline, disables duplicate submits and opens
  `/finance` on success. Passwords are never persisted.
- `/finance` loads private data only after Firebase authentication. Logout clears
  the visible workspace and auth session. Disabled members lose access immediately.
- Both administrator accounts share the original workspace across devices.
  Members receive only their assigned team's projects and payouts from the server.
- Original transactions, projects/shares/payouts, invoices, monthly plans, PDF
  and CSV exports, reports, settings, backup/restore and proof files retain their
  existing financial behavior with cloud records and protected proofs. Search fields use text
  inputs so the existing live-search handlers execute while typing.
- Narrow-screen tables scroll within their panel, Logout stays visible, and
  Settings is included in the original mobile navigation style.
- Returning to Transactions restores the selected record's proof preview.
- In project Overview, selecting a team payout row filters the adjacent transaction
  panel by both project and team. The team-name button supports keyboard selection,
  indicates its pressed state, and retains focus. Selecting it again or clearing
  the filter restores recent project transactions. Opening another project resets
  the filter. Record payout remains an independent action; previewing never saves data.
- Invoices do not count as received cash until settled, and paid payouts reduce cash.
- The user's 2026-10-25 instruction replaces the earlier receipt-based share rule:
  every new project requires a positive fixed project value. Team entitlement is
  fixed value × that project's configured percentage, regardless of receipts.
  Project cards show that fixed value; cash is reported separately. Existing
  projects use the values supplied by the user, retaining configured percentages.
- Recurring invoice receipts belong 100% to the company and never increase project
  value or team entitlements. Monthly-plan/source-Recurring invoices are automatic;
  manual service invoices have an explicit Company-only option. This classification
  persists on receipts so deleting an invoice does not reallocate its historical income.
- `functions/project-finance.js` owns shared calculation logic for the browser,
  server member projections and migration verification. Older clients and backups
  cannot accidentally remove already saved project values or income classifications.
- Choosing Paid when saving an invoice records only the unpaid balance as a
  linked received-income transaction in the same atomic server save. Paid is
  then derived from linked receipts, allowing receipt corrections. Other invoice
  statuses do not add income. The user's 2026-10-24 request authorizes this rule.
- Invoice payment links open the public `/pay` page through an HTTPS PDF link.
  The page displays only the link's payment details and QR, opens UPI only after
  an explicit click, and never reads private finance data or confirms settlement.
- Finance starter data is absent from the static build. All finance writes run
  through a validated, administrator-only callable; stale revisions are rejected.
- Teams owns names, members, credentials and explicit project access assignments.
  Assignments never change payout percentages. Existing share rules also assign
  project access. Passwords are never persisted or displayed after saving.
- Proof uploads accept files up to 25 MiB. Supported image/PDF/audio/video formats
  preview inline; other formats download. Members can read only assigned-team payout proofs.
- Existing standalone dialogs and confirmations are retained under the explicit
  same-HTML requirement. This task does not replace the original CRUD UX.
- Invoice project templates independently customize business/client details,
  terms, UPI destination, logo and signature. Service rows recalculate invoice
  totals on explicit save; choosing Paid explicitly records any unpaid balance. Templates
  never expose private details in member projections. One document renderer
  produces all preview, print and PDF pages, including overflow pagination.
