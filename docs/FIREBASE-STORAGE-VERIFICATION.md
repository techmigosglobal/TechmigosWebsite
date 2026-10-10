# Firebase Storage permission verification

The Storage rules read `user_profiles/<Auth UID>` in Firestore to authorize
active administrators. The Firebase Storage service agent must have
`roles/firebaserules.firestoreServiceAgent` on `techmigos-279f6`. Without this
grant, even valid administrator image/PDF uploads return `storage/unauthorized`.

Firebase CLI 15.31.0 skips the cross-service IAM check with `--non-interactive`
and also skips it when the rules source is unchanged. A successful rules
deployment alone does not verify this prerequisite.

Run from the repository root with `.env.local` configured and Google Cloud CLI
authenticated to the project:

```bash
# Read-only permission check; exits nonzero when the grant is missing.
node scripts/firebase/verify-storage-access.mjs

# Live integration test using an existing finance ID.
node scripts/firebase/verify-storage-access.mjs --smoke --finance-id=60
```

The smoke test creates a disposable Firebase Auth administrator and profile,
uploads a PDF and PNG, verifies signed preview bytes and unauthenticated read
denial, and checks rejected file types, inactive administrators, and anonymous
uploads. It deletes temporary objects and the disposable identity/profile in
`finally`; it does not attach proofs to finance records. A terminated process
can interrupt cleanup; test identities use `storage-check-` emails and test
objects use `permission-check-` filenames.

If the read-only check fails, restore only the required service-agent grant:

```bash
gcloud projects add-iam-policy-binding techmigos-279f6 \
  --member=serviceAccount:service-220055400039@gcp-sa-firebasestorage.iam.gserviceaccount.com \
  --role=roles/firebaserules.firestoreServiceAgent --condition=None
```

Then rerun verification. Keep proof access restricted to active administrators;
do not replace the rules with public access to work around an IAM failure.

Firebase reference: https://firebase.google.com/docs/rules/manage-deploy#manage_permissions_for_cross-service_cloud_storage_security_rules

## Repair evidence — 2026-10-10

- Live administrator PDF upload reproduced `storage/unauthorized` before repair.
- Restored the cross-service IAM grant on the Firebase Storage service agent.
- Firebase CLI compiled and released the existing rules successfully; authorization
  logic did not need changes.
- After IAM propagation, the live smoke test passed PDF/PNG uploads, signed
  preview byte comparisons, private-read checks, and all rejection checks above.
- Temporary objects, both profile documents, and Auth users were removed.
- Existing automated tests: 130 passed. Script syntax and Git whitespace checks passed.

This verifies the Firebase SDK and callable backend directly. It does not claim
a manual upload through the user's browser session. No frontend deployment is
required for the IAM repair.
