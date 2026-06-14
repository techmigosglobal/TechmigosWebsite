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

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **Techmigos** (API base `https://n2hhxvw3.ap-southeast.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
<!-- INSFORGE:END -->
