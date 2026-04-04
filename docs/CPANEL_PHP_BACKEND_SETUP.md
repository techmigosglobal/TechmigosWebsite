# cPanel Setup: Astro Static Frontend + PHP Form Backend

This setup keeps your current frontend and UI behavior unchanged, and swaps only the public API runtime to PHP.

## 1. Build and publish the static frontend

1. Run the Astro build locally:

```bash
npm run build
```

2. Upload the generated static output from `dist/` into cPanel `public_html/`.
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

## 6. Ensure PHP extensions and limits

Required extensions:

- `pdo_mysql`
- `fileinfo`
- `mbstring`

Recommended limits:

- `upload_max_filesize = 6M`
- `post_max_size = 8M`
- `max_file_uploads = 20`

## 7. URL compatibility and rewrites

`public_html/api/.htaccess` keeps existing frontend actions and fetch URLs working:

- `/api/csrf`
- `/api/leads/contact`
- `/api/leads/newsletter`
- `/api/leads/careers`

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
