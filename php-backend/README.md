# PHP Backend Module (cPanel)

This module provides PHP implementations for public form APIs while preserving existing frontend behavior.

## Included endpoints

- `GET /api/csrf`
- `POST /api/leads/contact`
- `POST /api/leads/newsletter`
- `POST /api/leads/careers`

## Folder layout

- `api/` runtime endpoints and rewrite rules
- `api/_core/` shared runtime internals
- `database/schema.sql` MySQL schema

## Response contract

The module returns the same envelope shape used by the existing frontend:

```json
{ "ok": true, "data": { "accepted": true } }
```

or

```json
{ "ok": false, "error": "Validation failed.", "fieldErrors": { "email": "Valid email is required." } }
```

## Deployment

Use `docs/CPANEL_PHP_BACKEND_SETUP.md` for cPanel deployment steps.

## Local integration test (frontend + PHP backend)

This project can run Astro frontend and PHP backend together on your local machine without changing form markup or UI code.

1. Start PHP API server from project root:

```bash
npm run php:serve:local
```

2. In a second terminal, start Astro dev server with API proxy enabled:

```bash
npm run dev:local-php
```

3. Run backend smoke tests (CSRF + all public forms):

```bash
npm run test:php-local
```

4. Optional UI-level manual checks:

- Submit form on `/contact`
- Submit footer newsletter form
- Submit application on `/careers/<slug>` with PDF/DOC/DOCX

The SQLite database is created automatically from `php-backend/database/schema.sqlite.sql` during local runs.
