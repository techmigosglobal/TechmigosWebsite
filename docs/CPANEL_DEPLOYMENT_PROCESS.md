# cPanel Deployment Process (Techmigos)

This guide is the clean, operational deployment reference for this project.

## 1. What gets deployed

- Static frontend build output from `dist/client/`
- PHP API backend from `php-backend/api/`

## 2. Where files are stored on cPanel

Assuming cPanel user `techmigo` and web root `/home/techmigo/public_html`:

| Local Source | Remote cPanel Path | Purpose |
|---|---|---|
| `dist/client/` | `/home/techmigo/public_html/` | Public static website files |
| `php-backend/api/` | `/home/techmigo/public_html/api/` | Public form API runtime |
| `php-backend/database/schema.sql` (temporary copy during import) | `/home/techmigo/schema.sql` | One-time or update schema import |
| runtime uploads | `/home/techmigo/public_html/storage/uploads/careers/` | Resume uploads |

## 3. Standard deployment command

Run from project root:

```bash
./scripts/deploy-cpanel.sh --no-schema
```

Use `--no-schema` for normal releases where database schema changes are not required.

If schema updates are needed:

```bash
./scripts/deploy-cpanel.sh
```

## 4. Safe prechecks (recommended before every release)

```bash
bash -n scripts/deploy-cpanel.sh
npm run build
./scripts/deploy-cpanel.sh --dry-run --no-build --no-schema --no-smoke --skip-env-check
```

## 5. Smoke checks included by deployment script

When smoke is enabled (default), the script verifies:

- `GET /api/csrf` returns `200`
- `POST /api/leads/contact` validation returns `400`
- `POST /api/leads/newsletter` validation returns `400`
- `POST /api/leads/careers` validation returns `400`
- `GET /api/admin/auth/me` returns `401` when unauthenticated
- `GET /api/admin/leads` returns `401` when unauthenticated
- `POST /api/admin/auth/login` with invalid creds returns `401`

## 6. Runtime configuration on cPanel

Required runtime values include DB, CSRF, upload, and mail settings.

Recommended options:

1. cPanel/Apache environment variables (preferred if hosting exposes them to PHP `getenv()`).
2. File fallback with `api/.env.php`.

## 7. Do we need to directly publish `.env` to cPanel?

Short answer: **not necessarily**.

- This PHP backend uses `getenv()` first, so panel-level environment variables can be enough.
- If cPanel env vars are not reliably available to PHP, use `api/.env.php` as fallback.

Important security guidance:

1. Do not commit secrets to git.
2. Do not expose secrets in publicly downloadable files.
3. If you use `api/.env.php`, keep deny rules active (existing API `.htaccess`) so config files are not directly accessible.
4. Prefer storing secrets outside web root when your hosting allows include-based loading.

## 8. Recommended release workflow

1. Run local checks and build.
2. Run dry-run deploy command.
3. Run real deploy command.
4. Confirm smoke checks pass.
5. Submit one real contact/newsletter/careers test and verify mailbox delivery.
6. Inspect server logs for mail failures.

## 9. Rollback (quick)

If production validation fails:

1. Restore previous `public_html/api/` backup.
2. Re-run smoke checks.
3. Re-test one form submission flow.

---

Primary automation file: `scripts/deploy-cpanel.sh`
