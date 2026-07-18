# Public SEO matrix

This matrix describes the production-intended, indexable public surface as of July 18, 2026. Private portal, CRM, login, and support routes are outside the public indexation scope.

| Route group | Intent | Primary page type | Schema / technical coverage |
| --- | --- | --- | --- |
| `/` | Explain TechMigos and start a project conversation | Home | Organization, WebSite, WebPage |
| `/services` and `/services/*` | Match a delivery need to an appropriate capability | Service overview / service detail | Organization, WebPage, BreadcrumbList |
| `/portfolio` and `/portfolio/*` | Show product and case-study work | Portfolio / case study | Organization, WebPage, BreadcrumbList |
| `/about` | Explain operating principles and technology focus | About | Organization, WebPage, BreadcrumbList |
| `/blog` and `/blog/*` | Publish dated engineering and product guidance | Collection / Article | Organization, WebPage, BreadcrumbList, Article |
| `/careers` and `/careers/*` | Publish currently available roles | Collection / job detail | Organization, WebPage, BreadcrumbList, JobPosting |
| `/contact` | Start a sales or partnership enquiry | Contact | Organization, WebPage, BreadcrumbList |
| `/privacy`, `/terms` | Make policy information clear | Legal | Organization, WebPage, BreadcrumbList |
| `/404` | Recover safely from unknown routes | Utility | `noindex` |

## Validation rules

- Indexable public pages must have one H1, a canonical URL, a 30–70 character title, and an 80–180 character description.
- `bun run validate` runs generated-page metadata, JSON-LD, and internal-link checks.
- `bun run test:e2e` tests the public route sample at desktop and mobile sizes, including automated axe checks for critical and serious WCAG 2 A/AA violations within page content.
- Sitemap entries are generated from public static routes, service pages, content collections, and portfolio data. Re-run the build before reviewing it.

## Editorial guardrails

- Do not add customer names, performance metrics, testimonials, certifications, pricing, delivery guarantees, or team claims unless the source is approved for public use.
- Date blog posts and career listings through their content frontmatter. Review stale roles before each production deployment.
- Use descriptive image alt text that explains the asset’s purpose; do not use keyword lists.
