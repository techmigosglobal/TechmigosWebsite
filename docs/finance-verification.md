# Finance handoff — 2026-10-24

The Firebase backend is deployed to `techmigos-279f6` / `220055400039`.
Both supplied administrator logins were verified against the live service.
The browser backup was imported without duplicate IDs: 18 transactions,
5 invoices, 2 projects and 2 teams. There were no attached proofs in that backup.
Original amounts were preserved when adding independent invoice templates.
The later authorized Paid-invoice reconciliation adds four linked income receipts
totalling ₹16,296 (Arish Ville ₹1,799; FocusToday ₹14,497). Re-running the preview
reports no remaining changes. Original invoice totals remain unchanged. Historical
receipt dates use invoice issue dates and include a note explaining that choice.

## Verification

- 13 unit tests passed, including schema validation and private team projections.
- All 13 browser workflows passed against isolated demo Firebase emulators:
  login/logout, persistence, ledger/project CRUD, shares, payouts, monthly plans,
  invoice receipts, reports/exports, backup/restore/reset, mobile navigation,
  Teams, member isolation, proof media and invoice templates.
- The invoice workflow passed again after final layout and upload repairs,
  including actual reference-signature upload, independent saved templates,
  service totals, multi-page documents, PDF download and print invocation.
- Four security/media browser tests passed again after restricting PDF iframes
  to their content type. HTML labelled with a `.pdf` filename does not execute.
- The generated invoice PDF is one A4 landscape page; the same renderer produces
  the preview and print pages. Printing was invoked in a controlled test; no
  physical printer was used.
- Build and static validation cover 18 pages. Type checks, DESIGN.md lint and
  whitespace checks pass. The npm dependency audit reports zero vulnerabilities
  after compatible patch updates and the gRPC patch override.

The example invoice artifact reproduces the supplied sample using an isolated
test ledger. It was not added to the live financial records. Private reference
assets and original backups remain local and are not part of the public build.

## Review notes

The generic premium UI static auditor reports seven actionless-button findings in
raw HTML template strings. These are false positives: the buttons use the
original `data-act` event delegation through `actionHandler`. Their team,
assignment, membership and invoice-template flows are exercised by browser tests.
The original document's native confirmations are retained under the explicit
same-HTML requirement. Shared-workspace reset wording now names its cloud scope.

Manual browser controls became unavailable in Work settings during the task.
Verification continued through the project's isolated automated Chrome tests,
rendered PDF inspection and actual Firebase API checks.

The Firebase rules are a tested implementation prototype. Review authorization
again before broadening access or adding new actions/collections.
The public website frontend has not been redeployed; the local build uses the
deployed Firebase backend. Existing empty blog/careers content warnings remain.

See `finance-frontend.md` for usage and `finance-firebase.md` for server contracts.

## Team preview, paid invoices and payment links

Team-row selection uses the existing project Overview panel and transaction
table. It filters by both project and team, supports native keyboard buttons,
preserves Record payout, and provides empty/reset states. Tests also cover
receipt inspection and narrow-screen navigation.

The Paid save flow creates only the unpaid balance, returns the normalized
workspace, and atomically refreshes team entitlement projections. Browser checks
cover a partial receipt plus Paid, repeated saves, reload persistence, project
isolation and stale save rejection. Unit checks cover exact cents and idempotency.

The PDF has a genuine indirect link annotation to the HTTPS `/pay` handoff.
PyMuPDF independently reads the target URI and link rectangle. The QR still
contains a direct UPI intent. The handoff is unauthenticated and never updates
finance data. Browser checks exercise popup navigation, invalid/changed link
data, copy success/failure, keyboard focus and narrow layout. An actual UPI app
and a real money transfer are outside the automated test environment.

Final checks for this changeset: 18 unit tests, five targeted browser workflows,
TypeScript checking and the 19-page production build pass. The corrected PDF/
payment and team-preview workflows passed on rerun. DESIGN.md lint reports zero
errors or warnings. The live callable still rejects anonymous access with 401.
The deployed backend and reconciliation are live; publish this frontend build
before sharing new PDF payment links, then regenerate the PDFs.
