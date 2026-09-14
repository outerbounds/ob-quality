# OB Quality

This repository contains automated quality testing for operational workflows and browser-based user experiences.

## Project Areas

### Meta-Flow Testing

The `flows/` directory contains Python-based tests for meta flows. These tests validate higher-level workflows, orchestration, and behavior that does not require browser UI automation.

### UI Testing

The `e2e/` directory contains browser-based end-to-end tests built with Playwright and TypeScript. UI tests are organized by the Models and Packages domains, with separate fixtures, page objects, specs, test data, and test plans.

See [`e2e/tests/README.md`](e2e/tests/README.md) for the Playwright test structure, import conventions, and validation workflow.

## Development Checks

Each project area keeps its own tooling: `flows/` uses the root-level
`pre-commit` configuration, and `e2e/` uses its existing npm pre-commit command.
Git honors a single hook path, so a Husky hook at [`.husky/pre-commit`](.husky/pre-commit)
is the entry point. Flow files and tooling configuration activate the Python
checks; files under `e2e/tests/` and `e2e/test-setup/` activate the Playwright
checks. A commit touching both scopes runs both.

Install the Python development requirements and the hook from the repository
root:

```bash
python -m pip install -r flows/requirements-dev.txt
npm --prefix e2e install
```

Do not run `pre-commit install`; it refuses to write a hook while Husky owns
`core.hooksPath`, and the Husky hook already invokes `pre-commit run`.

Run every local check explicitly with:

```bash
pre-commit run --all-files
npm --prefix e2e run quality:full
```

Staged `*_flow.py` changes run Ruff, focused pytest tests, and native Metaflow
definition checks; other staged Python changes run Ruff and the focused tests.
<<<<<<< HEAD
Ruff fixes are applied first, followed by the Playwright quality report. No hook
authenticates to Outerbounds or starts remote workloads.
=======
Staged files under `e2e/tests/` and `e2e/test-setup/` run lint-staged fixes and
then the Playwright quality report. No hook authenticates to Outerbounds or
starts remote workloads.
>>>>>>> bd3baf4 (fix pre-commit routing edge cases)

## Repository Layout

```text
ob-quality/
├── flows/    # Python meta-flow testing
└── e2e/      # Playwright UI testing
```
