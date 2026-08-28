# Playwright Test Structure

Tests are organized by product domain so Models and Packages remain independently maintainable.

## Directory Layout

```text
tests/
├── fixtures/
│   ├── models/fixture.ts
│   └── packages/fixture.ts
├── pages/
│   ├── models/
│   └── packages/
├── specs/
│   ├── models/
│   └── packages/
├── testdata/
│   ├── models/
│   └── packages/
├── test-plans/
│   ├── models/
│   └── packages/
└── storage-setup/
```

## Domain Ownership

All files for a feature must stay in the same domain:

- Model fixtures, pages, specs, test data, and plans belong under their respective `models/` directories.
- Package fixtures, pages, specs, test data, and plans belong under their respective `packages/` directories.
- Do not place TypeScript files directly in `fixtures/`, `pages/`, `specs/`, or `testdata/`.
- Do not import Models artifacts from Packages code or Packages artifacts from Models code.
- `storage-setup/` contains shared authentication and session infrastructure only.

## Imports

Use the configured aliases instead of relative imports:

| Purpose             | Alias                                          |
| ------------------- | ---------------------------------------------- |
| Model fixture       | `@models-fixture`                              |
| Package fixture     | `@packages-fixture`                            |
| Shared fixture base | `@page-setup`                                  |
| Page objects        | `@pages/models/*` or `@pages/packages/*`       |
| Test data           | `@testdata/models/*` or `@testdata/packages/*` |

Model specs import `test` from `@models-fixture`; package specs import it from `@packages-fixture`.

## Generated Test Workflow

After generating or changing tests:

1. Run `npm run validate:architecture` to check placement, fixture imports, and domain boundaries.
2. Run `npm run validate` to run the architecture check and TypeScript compiler.
3. Run `npm run lint`.
4. Run the targeted spec with `npx playwright test tests/specs/<domain>/<spec>.spec.ts`.

## Empty Directories

Git does not track empty directories. A `.gitkeep` file preserves a domain directory until it contains a real plan, page, spec, or test-data file. Remove the placeholder after adding the first real file to that directory.

## Agent Guidance

Repository-specific agent routing is defined in `.claude/skills/ob-quality/`. Packaged agents and common skills remain unchanged so package upgrades do not overwrite this project architecture.
