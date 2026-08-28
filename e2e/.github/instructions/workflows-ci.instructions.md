---
applyTo: '.github/workflows/**'
---

# GitHub Actions Workflows

Workflow changes affect credentials, cost, release safety, and test trust. Review workflows as security-sensitive executable code.

## Core Rules

- Enforce least privilege for workflow and job permissions.
- Keep privileged operations isolated from untrusted pull request execution.
- Ensure install, build, and test steps are deterministic and aligned with repository scripts.
- Keep artifact and cache strategy explicit and bounded.

## Safety

- Use least-privilege `permissions`; add only the grants a job needs.
- Never echo secrets or tokens.
- Do not run untrusted fork code with write tokens, package tokens, or OIDC credentials.
- Changes to triggers, `if:` conditions, or runner pools can change who can start privileged or expensive work.
- Prefer explicit branch and path filters for expensive or privileged jobs.

## Playwright CI

- Set up Node before running `npm`, `npx`, or Playwright.
- Prefer `npm ci` for lockfile-based installs.
- Install browsers before running Playwright tests unless the runner image guarantees them.
- Upload Playwright reports and traces only when useful, with bounded retention.
- Keep workflow commands aligned with `package.json` scripts when scripts exist.
- Ensure artifact paths reflect actual output locations such as `playwright-report/` and `test-results/` when produced.

## Reliability

- Use clear job names and timeouts.
- Avoid concurrency settings that cancel the primary test run from secondary triggers.
- Cache only when the key is correct and does not hide dependency drift.
- Pin third-party actions when the repo requires strict supply-chain control; otherwise keep action versions consistent across workflows.
- Prefer fail-fast behavior only when it does not obscure needed diagnostics.

## Review Checklist

Flag these as findings:

- Secret or token exposure in logs.
- Missing Node setup before `npm` or `npx`.
- Install and test commands that do not match `package.json`.
- New privileged trigger path without fork or actor safeguards.
- Artifact paths that miss the real Playwright report output.
- Concurrency or condition changes that can silently skip required validation.
