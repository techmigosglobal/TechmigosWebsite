# cPanel Setup: Astro Static Frontend + PHP Form Backend

This setup keeps your frontend/UI static and uses PHP runtime APIs for both public forms and admin CRM workflows.

## 1. Build and publish the static frontend

1. Run the Astro build locally:

```bash
npm run build
```

2. Upload the generated static output from `dist/client/` into cPanel `public_html/`.
3. Keep URLs unchanged (`/contact`, `/careers/...`, `/api/leads/...`) so no frontend JavaScript changes are required.

## 2. Upload PHP backend files

Copy these paths into cPanel `public_html/`:

- `php-backend/api/` -> `public_html/api/`
- `php-backend/database/schema.sql` -> temporary upload location for import (or copy SQL manually)

Important:

- Keep `public_html/api/_core` present but not directly accessible.
- `public_html/api/.htaccess` already blocks direct access to `_core`.

## 3. Configure writable storage for resumes

Create directory:

- `public_html/storage/uploads/careers`

Set permissions:

- `storage/` -> `755`
- `storage/uploads/` -> `755`
- `storage/uploads/careers/` -> `755` (use `775` only if your host user needs group write)

## 4. Create MySQL tables

In cPanel phpMyAdmin:

1. Open your application database.
2. Import `php-backend/database/schema.sql`.

This creates:

- `contact_leads`
- `newsletter_subscribers`
- `career_applications`
- `rate_limit_counters`
- `admin_users`
- `admin_sessions`
- `admin_activity_logs`
- `testimonials`
- `portfolio_projects`
- `portfolio_results`
- `lead_notes`

After schema import, run local/bootstrap migration to seed admin user + initial content:

```bash
npm run migrate:crm-content
```

## 5. Set PHP environment values

Use cPanel environment configuration (`.htaccess` SetEnv, MultiPHP INI Editor, or hosting panel env settings):

Required:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`

Recommended:

- `APP_ENV=production`
- `APP_TIMEZONE=UTC`
- `CSRF_SECURE_COOKIE=true`
- `CAREER_UPLOAD_DIR=/home/<cpanel-user>/public_html/storage/uploads/careers`
- `ADMIN_USERNAME=<bootstrap-admin-username>`
- `ADMIN_PASSWORD=<bootstrap-admin-password>`
- `ADMIN_EMAIL=<bootstrap-admin-email>`
- `ADMIN_NAME=<bootstrap-admin-name>`

## 6. Ensure PHP extensions and limits

Required extensions:

- `pdo_mysql`
- `fileinfo`
- `mbstring`

Recommended limits:

- `upload_max_filesize = 6M`
- `post_max_size = 8M`
- `max_file_uploads = 20`

## 6.1 Configure transactional emails for form submissions

Public forms now support email notifications:

1. User confirmation email for contact/newsletter/careers.
2. Company notification email for all three forms.

Required configuration keys (via `api/.env.php` or cPanel env):

- `MAIL_ENABLED=true`
- `MAIL_FROM_ADDRESS=<verified-sender@your-domain>`
- `MAIL_FROM_NAME=Techmigos`
- `MAIL_COMPANY_TO=<company-inbox@your-domain>`
- `MAIL_SEND_USER_CONFIRMATIONS=true`
- `MAIL_SEND_COMPANY_NOTIFICATIONS=true`

Optional:

- `MAIL_ADDITIONAL_PARAMS` (for host-specific `mail()` send flags)

Notes:

1. Default implementation uses PHP `mail()` which works on most cPanel setups.
2. Form submission remains accepted even if email sending fails; failures are logged server-side.
3. For best deliverability, ensure SPF/DKIM/DMARC are configured for your domain.

## 7. URL compatibility and rewrites

`public_html/api/.htaccess` keeps existing frontend actions and fetch URLs working:

- `/api/csrf`
- `/api/leads/contact`
- `/api/leads/newsletter`
- `/api/leads/careers`
- `/api/admin/auth/login`
- `/api/admin/auth/logout`
- `/api/admin/auth/me`
- `/api/admin/testimonials`
- `/api/admin/portfolio`
- `/api/admin/leads`
- `/api/admin/users`

No frontend form action or script changes are needed.

## 8. Verification checklist

1. Open contact page and submit with valid values.
2. Open footer newsletter form and submit valid email.
3. Open a careers role page and submit with a PDF/DOC/DOCX under 5 MB.
4. Confirm rows are inserted in MySQL tables.
5. Confirm uploaded resumes appear in `storage/uploads/careers`.
6. Confirm invalid CSRF requests return `403` with:

```json
{"ok":false,"error":"Invalid CSRF token. Please refresh the page and try again."}
```

7. Confirm aggressive repeated requests return `429`.

## 9. Rollback path

If release validation fails:

1. Restore previous `public_html/api/` directory backup.
2. Keep static `public_html/` build as-is.
3. Re-test three public forms.

## Local integration test before cPanel rollout

Run this full local check first to confirm frontend + PHP backend contract parity:

1. Terminal A:

```bash
npm run php:serve:local
```

2. Terminal B:

```bash
npm run dev:local-php
```

3. Terminal C:

```bash
npm run test:php-local
```

This verifies `GET /api/csrf` and all public form APIs before deploying to cPanel.

## Fastest terminal-first production deployment (SSH + rsync + phpMyAdmin alternative)

Use this path when you want to deploy directly from your local terminal.

Deployment script notes:

1. `scripts/deploy-cpanel.sh` checks runtime env readiness before syncing.
2. By default, it looks for remote `api/.env.php` as a safe fallback signal.
3. If you use cPanel/Apache environment variables instead, use `--skip-env-check`.
4. Smoke checks validate `/api/csrf` plus `contact`, `newsletter`, and `careers` validation contracts.

Known server values:

- SSH host: `techmigos.com`
- SSH port: `22`
- cPanel user: `techmigo`
- Web root: `/home/techmigo/public_html`
- DB name: `techmigo_cmpny`
- DB user: `techmigo_vinay`

### 1) Verify local SSH key pair

Important: SSH login from your PC requires a private key on your PC and a matching public key authorized in cPanel.

- If you only downloaded a `.pub` file and do not have its matching private key locally, generate a new pair on your Mac and authorize the new public key in cPanel.

Commands:

```bash
ls -la ~/.ssh
ssh-keygen -t ed25519 -C "techmigo@techmigos.com" -f ~/.ssh/techmigos_prod
cat ~/.ssh/techmigos_prod.pub
```

Then copy the displayed public key text into cPanel -> SSH Access -> Manage SSH Keys -> Import Key -> Authorize.

### 2) Add SSH host alias on your PC

Edit `~/.ssh/config`:

```bash
Host techmigos-prod
	HostName techmigos.com
	User techmigo
	Port 22
	IdentityFile ~/.ssh/techmigos_prod
	IdentitiesOnly yes
```

Test:

```bash
ssh techmigos-prod "whoami && pwd"
```

Expected output includes `techmigo` and `/home/techmigo`.

### 3) Build locally

From project root:

```bash
npm run build
```

### 4) Deploy static frontend and PHP backend from terminal

Deploy static frontend (do not delete backend storage folders):

```bash
rsync -az --delete \
	--exclude "api/" \
	--exclude "storage/" \
	dist/ techmigos-prod:/home/techmigo/public_html/
```

Deploy PHP API runtime:

```bash
rsync -az --delete \
	php-backend/api/ techmigos-prod:/home/techmigo/public_html/api/
```

Create upload directory on server:

```bash
ssh techmigos-prod "mkdir -p /home/techmigo/public_html/storage/uploads/careers"
```

Preferred (project automation):

```bash
./scripts/deploy-cpanel.sh
```

Useful flags:

```bash
./scripts/deploy-cpanel.sh --dry-run --no-build --no-schema --no-smoke
./scripts/deploy-cpanel.sh --skip-env-check   # first-time bootstrap only
```

### 5) Import database schema from terminal

Copy schema file to server and import:

```bash
scp php-backend/database/schema.sql techmigos-prod:/home/techmigo/schema.sql
ssh techmigos-prod "mysql -h localhost -u techmigo_vinay -p techmigo_cmpny < /home/techmigo/schema.sql"
```

When prompted, type your DB password.

### 6) Configure API environment on cPanel

Set these values in your cPanel environment mechanism (or `SetEnv` directives in Apache config where supported):

- `APP_ENV=production`
- `DB_DRIVER=mysql`
- `DB_HOST=localhost`
- `DB_PORT=3306`
- `DB_NAME=techmigo_cmpny`
- `DB_USER=techmigo_vinay`
- `DB_PASS=<your-db-password>`
- `CSRF_SECURE_COOKIE=true`
- `CAREER_UPLOAD_DIR=/home/techmigo/public_html/storage/uploads/careers`

If cPanel does not expose these values to `getenv()` reliably, use file-based fallback config:

1. Copy template and edit secrets on your local machine:

```bash
cp php-backend/api/.env.php.example php-backend/api/.env.php
```

2. Fill DB values in `php-backend/api/.env.php`.

3. Deploy API again so this file lands on server:

```bash
./scripts/deploy-cpanel.sh --no-schema --no-build --no-smoke
```

4. Verify quickly:

```bash
curl -i https://techmigos.com/api/csrf
```

Important:

1. Keep `api/.env.php` private and never commit real secrets.
2. If you prefer server-only edits, create `/home/techmigo/public_html/api/.env.php` directly over SSH.

### 7) Quick production smoke test

```bash
curl -i https://techmigos.com/api/csrf
curl -i -X POST https://techmigos.com/api/leads/contact \
	-H "Content-Type: application/json" \
	-d '{}'
```

Expected:

- `/api/csrf` returns `200`
- invalid contact payload returns `400`

Then verify manually in browser:

1. Contact form submit
2. Newsletter submit
3. Careers submit with PDF/DOC/DOCX

### 8) Security notes

- Prefer key-based SSH only (disable password SSH if host allows).
- Do not keep DB password in shell history.
- If you previously shared DB credentials, rotate password after first successful deployment.

## One-command deploy automation from terminal

You can deploy with one command using:

- [scripts/deploy-cpanel.sh](scripts/deploy-cpanel.sh)

First-time setup:

```bash
npm run deploy:cpanel:init
chmod +x scripts/deploy-cpanel.sh
```

Edit `scripts/deploy-cpanel.env` with your server/domain/db values.

Run full deploy:

```bash
npm run deploy:cpanel
```

Useful flags:

```bash
./scripts/deploy-cpanel.sh --dry-run
./scripts/deploy-cpanel.sh --no-schema
./scripts/deploy-cpanel.sh --no-build
./scripts/deploy-cpanel.sh --no-smoke
```

Notes:

1. The script syncs static frontend (`dist/client/`) and PHP API (`php-backend/api/`).
2. It protects `api/` and `storage/` during static sync.
3. If schema import is enabled, MySQL prompts for DB password interactively on the server.
4. If `rsync` is not installed on the cPanel host, the script automatically falls back to a `tar`-over-SSH deployment path.
