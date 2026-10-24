# Techmigos Codex Agent Guide

This project ships with an Antigravity toolkit in `.agents/`.
Use it as the primary process guide for planning, implementation, testing, and reviews.

## Primary Sources

- Architecture: `.agents/ARCHITECTURE.md`
- Specialist personas: `.agents/agents/*.md`
- Skills: `.agents/skills/*/SKILL.md`
- Workflows: `.agents/workflows/*.md`

## Working Protocol

1. Start with workflow selection from `.agents/workflows/` based on task type (`plan`, `create`, `debug`, `enhance`, `test`, `deploy`).
2. Load only the minimal relevant skill(s) from `.agents/skills/` for the current task.
3. Use specialist agent specs in `.agents/agents/` as role guidance for reasoning style and acceptance criteria.
4. Apply global rule guidance from `.agents/rules/GEMINI.md` where it does not conflict with higher-priority system/developer/user instructions.
5. Prefer deterministic validation using local scripts and tests before finalizing.

## Scope Guardrails

- Keep changes focused and production-ready.
- Preserve existing UI/UX and architecture patterns unless task requires redesign.
- Never use destructive git commands unless explicitly asked.

## Firebase Backend

This project uses Firebase project `techmigos-279f6` (number `220055400039`) for public form submissions and the authenticated finance workspace. The older CRM portal remains removed; the finance application was added on 2026-10-24 at the user's request.

- **Browser bridge:** `src/lib/firebase/publicBridge.js` exposes only the public Firestore insert and resume upload contract.
- **Configuration:** app code reads the public Firebase web configuration from `.env.local` (`PUBLIC_FIREBASE_*`). Never commit private service-account credentials.
- **Migration source:** `supabase/` and `scripts/backend/` remain historical export evidence only; active browser traffic uses the public Firebase bridge.
- **Finance runtime:** `src/scripts/finance-runtime.js` owns Firebase Auth, finance callable access and protected proof uploads. The original HTML is rendered by `src/pages/finance.astro`.
- **Finance server:** `functions/index.js` validates administrator writes and manages member accounts. Members receive only assigned-team project/payout projections. Direct browser finance writes are denied.
- **Invoice documents:** project-specific templates and invoice services are validated by `functions/domain.js`; one renderer supplies preview, landscape print and PDF.

Key patterns:

- Public forms write to `contact_leads`, `newsletter_subscribers`, and `career_applications`.
- Resume uploads are anonymous, limited to `resumes/applications/`, and restricted by Storage Rules to PDF/DOC/DOCX files below 5 MiB.
- Finance data was migrated from the user's browser backup: 18 transactions, 5 invoices, 2 projects and 2 teams. See `docs/finance-firebase.md` for current contracts and test commands. Never seed live data from test fixtures.
