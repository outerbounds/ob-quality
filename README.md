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
is the entry point. Staged Python files activate FlowSpec filename validation;
files under `flows/` also activate the flow checks. Added, copied, modified, or
renamed files under `e2e/tests/` and `e2e/test-setup/` activate the Playwright
checks. Deletion-only e2e changes skip that staged-file pipeline. A commit
touching both scopes runs both.

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

Staged `*_flow.py` changes run Ruff and native Metaflow definition checks;
checker tests run only when checker tooling or configuration changes. Staged
existing files under `e2e/tests/` and `e2e/test-setup/` are formatted and linted
before the Playwright quality report runs. The hook also rejects conflict
markers and whitespace errors in staged changes. No hook authenticates to
Outerbounds or starts remote workloads.

## Repository Layout

```text
ob-quality/
├── flows/    # Python meta-flow testing
└── e2e/      # Playwright UI testing
```
