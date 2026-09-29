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

This project uses Firebase project `techmigos-279f6` for Firestore, Authentication, Cloud Storage, and callable Cloud Functions.

- **Browser bridge:** `src/lib/firebase/supabaseBridge.js` preserves the existing CRM repository contract while using the Firebase modular SDK.
- **Configuration:** app code reads the public Firebase web configuration from `.env.local` (`PUBLIC_FIREBASE_*`). Never commit private service-account credentials.
- **Server function:** `functions/index.js` contains the privileged `adminUsers` callable function for user provisioning and profile administration.
- **Migration source:** `supabase/` and `scripts/backend/` remain historical export evidence only; active browser traffic uses Firebase.

Key patterns:

- CRM records are Firestore documents in collections named after the existing `crm_*` tables.
- Firebase Auth `uid` values are preserved from the verified source export and mirrored in `user_profiles`.
- Storage uploads persist the bucket-relative object path in the matching Firestore record; finance proof paths are under `finance-proofs/`.
