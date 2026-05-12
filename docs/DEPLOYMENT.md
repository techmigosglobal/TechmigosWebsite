# Deployment Notes (Hybrid Astro + Node)

## Alternative Runtime: cPanel PHP Backend for Public Forms

- You can deploy Astro as static pages/assets and run only public form APIs with PHP.
- This keeps frontend markup, CSS, and JavaScript unchanged while moving backend execution to cPanel PHP + MySQL.
- Public endpoints covered by PHP module:
  - `/api/csrf`
  - `/api/leads/contact`
  - `/api/leads/newsletter`
  - `/api/leads/careers`
- Admin/CRM APIs are now available from the PHP module:
  - `/api/admin/auth/*`
  - `/api/admin/testimonials*`
  - `/api/admin/portfolio*`
  - `/api/admin/leads*`
  - `/api/admin/users*`
- Setup guide: see `docs/CPANEL_PHP_BACKEND_SETUP.md`.

### cPanel Deployment Validation

- Use `./scripts/deploy-cpanel.sh` as the primary deploy path for production.
- The deploy script performs a remote `api/.env.php` preflight check by default.
- For first-time bootstrap only, bypass with `--skip-env-check`.
- Use non-destructive validation before release:
  - `bash -n scripts/deploy-cpanel.sh`
  - `./scripts/deploy-cpanel.sh --dry-run --no-build --no-schema --no-smoke`
- Default smoke checks cover:
  - `GET /api/csrf`
  - validation contract for `POST /api/leads/contact`
  - validation contract for `POST /api/leads/newsletter`
  - validation contract for `POST /api/leads/careers`

## Runtime

- Astro output mode is `hybrid` with `@astrojs/node` adapter.
- Public pages remain prerendered by default.
- Runtime routes are explicitly marked `prerender = false` for Astro Node deployments only.
- In cPanel static deployments, admin pages are static and use PHP APIs for runtime data/auth.

## Required Environment Variables

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET` (must be strong, minimum 24 characters in production)

Optional:

- `SITE_CONTENT_PATH` (defaults to `data/site-content.json`)
- `LEADS_FILE_PATH` (defaults to `data/leads.json`)
- `CAREER_UPLOAD_DIR` (defaults to `data/uploads/careers`)

## Security Guardrails

- In production, weak/default admin credentials and session secret are rejected.
- Lead endpoints include:
  - honeypot field check (`company_website`)
  - lightweight in-memory rate limiting

## Verification Checklist

1. `npm run build`
2. `./scripts/verify-blog-content.sh`
3. Confirm admin login/logout/content update/lead workflow works in deployed environment.
4. Confirm contact/careers/newsletter submissions persist to configured leads file.
5. Confirm career resume uploads are written to the configured upload directory.
