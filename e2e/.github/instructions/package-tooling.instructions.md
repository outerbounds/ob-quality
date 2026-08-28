---
applyTo: 'package.json,package-lock.json,tsconfig.json,eslint.config.*,prettier.config.*,.prettierrc,.prettierignore,.husky/**,.npmrc'
---

# Package And Tooling

Treat package and tooling edits as executable behavior. Script names, dependencies, and config paths must remain runnable in this repo.

## Core Rules

- Verify script, binary, and config references exist before approving changes.
- Keep consumer-repo script wiring pointed to published `playwright-utils-*` bins.
- Avoid hidden side effects in lifecycle scripts unless clearly justified.
- Keep lockfile and dependency changes consistent.

## package.json

- `@anaconda/playwright-utils` should be a direct dev dependency for consumer QA projects.
- Test scripts should use Playwright commands or the published `playwright-utils-*` bins, not private paths from the utility library repo.
- If `package.json` changes dependencies, `package-lock.json` should change consistently.
- Do not add broad install-time side effects without a clear reason.
- Do not echo secrets or tokens in scripts.
- Keep quality scripts coherent: `check:code-quality`, `quality:full`, `quality:report`, and `precommit` should remain aligned with QA workflow expectations.

## TypeScript, ESLint, And Formatting

- Preserve path aliases used by the project: `@pages/*`, `@testdata/*`, `@fixture`, and `@playwright-config`.
- Do not remove strictness guards (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noImplicitOverride`) without explicit rationale.
- `eslint.config.*` should extend or align with `@anaconda/playwright-utils/eslint`.
- Formatting scripts may rewrite files; do not run them during review unless asked.
- If a config change weakens a test-quality rule, require a specific justification.

## Husky And Quality Gates

- Pre-commit wiring should call `playwright-utils-precommit` from the QA package root.
- Full quality scripts should map to the published bins used by consumer projects.
- Keep `lint`, `lint:fix`, `format`, `check:code-quality`, `quality:full`, `quality:report`, and `precommit` behavior clear and consistent.
- If `lint-staged` is present, ensure it complements `precommit` rather than bypassing QA checks.

## Review Checklist

Flag these as findings:

- Script points to a missing command, private library path, or non-portable shell behavior.
- Dependency and lockfile changes do not match.
- Secret values are printed or hardcoded.
- Path aliases no longer match imports in tests.
- A quality gate is removed or weakened without an explicit reason.
- Lifecycle or hook changes introduce non-deterministic setup behavior.
