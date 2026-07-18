# Public website production readiness

## Verified locally

- Bun lockfile installation
- Astro type and template checks
- Static production build
- Existing content verification and SEO audit
- Generated public SEO and internal-link validation
- Playwright desktop and mobile public-route suite with axe checks

## Before a production deployment

1. Review the generated `reports/seo-audit.json` and sitemap on the preview deployment.
2. Confirm public contact, newsletter, and careers submissions against the deployed Supabase configuration without exposing environment values.
3. Run `bun run build`, `bun run validate`, and `bun run test:e2e` from a clean checkout.
4. Deploy a Vercel preview, smoke-test the listed public routes, then request approval for a production deployment.

## Rollback

Vercel supports an instant rollback by promoting the previous known-good deployment. For source rollback, revert the relevant focused Git commit rather than resetting the branch history. Re-run the complete validation set before creating a replacement preview.
