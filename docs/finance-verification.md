# Finance handoff — 2026-10-24

The Firebase backend is deployed to `techmigos-279f6` / `220055400039`.
Both supplied administrator logins were verified against the live service.
The browser backup was imported without duplicate IDs: 18 transactions,
5 invoices, 2 projects and 2 teams. There were no attached proofs in that backup.
Live verification confirms all original financial records remain unchanged after
adding independent invoice templates to both projects.

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

The generic premium UI static auditor reports six actionless-button findings in
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
