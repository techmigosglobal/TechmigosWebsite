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
