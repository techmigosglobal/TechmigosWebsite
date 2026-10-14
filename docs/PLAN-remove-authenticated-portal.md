# Remove authenticated portal and CRM

## Scope

- Remove the login, password recovery, client portal, and company CRM routes.
- Remove the authenticated CRM browser runtime, repository, components, styles, and tests.
- Keep public marketing pages and their anonymous contact, support, newsletter, and careers submission flows.
- Replace the auth-aware Firebase bootstrap with a public-only Firestore/Storage bridge.
- Reduce Firebase rules to the remaining public form collections and anonymous resume uploads.
- Empty the connected Firebase project's Firestore, Auth, and default Storage data, then delete the obsolete deployed callables.

## Safety boundaries

- The connected project is verified as `techmigos-279f6` from `.firebaserc` and the Firebase CLI.
- Existing unrelated working-tree changes remain untouched.
- Firebase source configuration remains in the repository so public forms can continue to work after the cleanup.

## Verification

- Search source and generated output for removed routes and authenticated runtime references.
- Run the Node test suite, Astro build, static-site validation, and `git diff --check`.
- Re-enumerate Firestore, Auth, Storage, and Functions after cleanup.
