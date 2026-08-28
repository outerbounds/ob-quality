# Agent instructions — Playwright QA project

Thin pointer for agent CLIs (Codex, Copilot, and others). The canonical documents live elsewhere — read them; do not duplicate their rules here.

- Project conventions (POM rules, locator priority, imports, commands) — [`CLAUDE.md`](CLAUDE.md).
- QA review checklist — `.claude/skills/qa-automation-quality/references/qa-automation-guidelines.md` (installed by `npx anaconda-pw-setup`).
- Library API for all test code — `.claude/skills/anaconda-playwright-utils/SKILL.md`. Always use `@anaconda/playwright-utils` functions instead of the raw Playwright API.
- For local pre-push reviews in Claude Code, run `/pr-review`.

Never commit, push, or tag unless the maintainer explicitly asks.
