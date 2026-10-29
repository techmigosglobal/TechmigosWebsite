# Missing proof approval

- Only active administrator Vinay (`vinay@techmigos.com`) can explicitly approve a transaction with no attached proofs.
- Reuse saved invoice signature or approval images. Require a real signature; use a blue round Techmigos stamp when none is saved.
- Generate an internal approval voucher, clearly identifying the missing original receipt, transaction, reason, approving user and time.
- Server prepares the authoritative document model and atomically attaches the PDF after checking the transaction has not changed. Retain an audit record and document hash.
- Existing approved transactions cannot change without first removing their voucher. Other admins cannot remove the approval.
- Validate permissions, missing-only eligibility, concurrency, signature requirements and the browser preview/approval flow.
- Shared expenses use one ledger record and editable project shares, initially split equally. Project calculations use only their share, while company totals count the transaction once. Validate exact paise totals and reject invalid/duplicate projects.
