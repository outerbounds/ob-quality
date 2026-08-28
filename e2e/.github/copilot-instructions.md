# Copilot Instructions - Playwright QA Project

This repository is a Playwright TypeScript QA project built on `@anaconda/playwright-utils`.

## Priority And Scope

- Treat `CLAUDE.md` and `.claude/skills/anaconda-playwright-utils/SKILL.md` as the canonical source for test implementation rules.
- Use `.github/instructions/*.instructions.md` as path-routed policy overlays.
- If guidance conflicts, prefer canonical project docs over local examples.
- Verify claims against the checked-out tree before asserting behavior.

## Non-Negotiable Rules

- Keep existing architecture: page objects, fixture wiring, testdata modules, and path aliases.
- Use `@anaconda/playwright-utils` helpers instead of raw Playwright APIs where helper coverage exists.
- Do not stage, commit, push, tag, or amend history unless the user explicitly asks.
- Do not run file-writing autofix commands during review unless requested.
- Keep edits minimal and scoped; avoid opportunistic refactors unrelated to the task.

## Required Context Before Test Changes

Load these documents before generating, editing, or reviewing Playwright test code:

- `CLAUDE.md`
- `.claude/skills/anaconda-playwright-utils/SKILL.md`
- `.claude/skills/anaconda-playwright-utils/references/locators.md`
- `.claude/skills/qa-automation-quality/references/qa-automation-guidelines.md`

## Execution Discipline

- Confirm scripts, aliases, commands, and paths exist before recommending them.
- Prefer existing repo script names over ad-hoc shell sequences.
- If a requested change cannot be validated locally, say so explicitly and state what was not validated.
- For broad doc or policy updates, perform drift checks across related docs (`CLAUDE.md`, `.github/`, `.claude/`, `.cursor/`, root markdown files).

## Review Output Contract

For reviews, lead with findings in this format:

`[severity | confidence] category - path:line - issue - impact - fix`

- Severity: `critical`, `major`, `minor`, `info`.
- Confidence: `high`, `medium`, `low`.
- Prioritize correctness, reliability, maintainability, security, and documentation drift.
- Cover every changed file with findings or explicit all-clear.
- Re-check current tree state before repeating older claims.
- End with finding count, or exactly: `All checks passed - no issues found across the applicable categories.`

## Path Routing

- `tests/**`, `test-setup/**`, `playwright.config.ts` -> `playwright-tests.instructions.md`
- `.claude/**`, `.cursor/**`, `AGENTS.md`, `CLAUDE.md`, `**/*.md` -> `ai-docs.instructions.md`
- `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.*`, `prettier.config.*`, `.prettierrc`, `.prettierignore`, `.husky/**`, `.npmrc` -> `package-tooling.instructions.md`
- `.github/workflows/**` -> `workflows-ci.instructions.md`
