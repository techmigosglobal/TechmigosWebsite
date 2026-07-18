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

## Speed Insights and performance follow-up

- The Astro `SpeedInsights` component is installed once in `BaseLayout`. Its generated script points to `/_vercel/speed-insights/script.js`; this is expected to be served by Vercel, not by Astro's local static build.
- If that request returns 404 on a Vercel preview, confirm the deployment is linked to the intended Vercel project and enable Speed Insights in that project's dashboard. Then reload the preview with browser extensions disabled and inspect the Network panel for a successful script response.
- The local `dist` directory is approximately 48 MB, dominated by public PNG case-study screenshots and private CRM page output. Before a production release, measure the actual public-route transfer sizes on the preview and prioritize responsive WebP/AVIF variants for any above-the-fold case-study imagery that is materially large.

## Rollback

Vercel supports an instant rollback by promoting the previous known-good deployment. For source rollback, revert the relevant focused Git commit rather than resetting the branch history. Re-run the complete validation set before creating a replacement preview.
