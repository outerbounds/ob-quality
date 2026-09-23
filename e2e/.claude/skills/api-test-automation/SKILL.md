---
name: api-test-automation
description: >
  Use this skill for writing, extending, or reviewing API automation tests in any Playwright TypeScript
  project built on `@anaconda/playwright-utils`. Trigger on: "write API test", "add API coverage",
  "test this endpoint", "add positive/negative scenarios", "add auth or 401/403 tests", "validate a
  response body or schema", "add API test data". Covers the API class pattern (separate action and
  assert methods), response type definitions, endpoint URL builders, fixture registration, coverage
  matrices by endpoint type, and test-data selection. Project-agnostic — inspect the consuming
  repository and follow its structure, aliases, and naming.
allowed-tools:
  - Bash
  - Glob
  - Grep
  - Read
  - Write
  - Edit
version: 2.1.0
---

# API Test Automation

API test automation patterns for Playwright TypeScript projects using `@anaconda/playwright-utils`.

This skill defines the **patterns**, not the paths. Every project wires its own directories, aliases, fixtures, endpoint constants, and environment configuration — inspect the repository you are working in and follow what it already does.

## Step 0: Inspect the Consuming Project (do this first)

Never assume a layout. Establish these facts before writing any file:

| What to establish                       | Where to look                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Path aliases                            | `tsconfig.json` → `compilerOptions.paths` (commonly `@pages/*`, `@testdata/*`, `@fixture`)                                |
| Where API classes live                  | Use `Glob` (Kilo: `glob`) for existing `*-api.ts` / API page objects                                                      |
| Whether a response-verifier base exists | Use `Grep` (Kilo: `grep`) for `class ResponseVerifier` or `verifyOkResponse`                                              |
| Whether shared API helpers exist        | Use `Grep` (Kilo: `grep`) for `getFirstListItem`, `verifyUuidFormat`, or a shared API utils module                        |
| How endpoint URLs are built             | Use `Grep` (Kilo: `grep`) for `new URL(` or an existing endpoints module — reuse it, never hardcode a URL in a spec       |
| Base URL / env configuration            | `playwright.config.ts` — what it exports (e.g. a `BASE_URL` const) and what it reads from `process.env`                   |
| Auth mechanism                          | `playwright.config.ts` → `use.extraHTTPHeaders`, storage state, or an auth setup project                                  |
| Spec location and tag vocabulary        | Use `Glob` (Kilo: `glob`) for existing `*.spec.ts`; use `Grep` (Kilo: `grep`) for `test.describe(` to see the tags in use |
| Fixture registration file               | The file behind the `@fixture` alias (commonly `tests/fixtures/fixture.ts`)                                               |

Record what you find and reuse it. If the project has no API tests yet, follow the typical layout below and match the project's existing naming style.

## Typical Project Structure (illustrative)

A common Playwright TypeScript layout. Treat it as a starting point, not a requirement — the actual paths come from Step 0.

```
tests/
├── fixtures/fixture.ts               # Fixture registration (behind the @fixture alias)
├── pages/api/
│   ├── api-endpoints.ts              # Endpoint URL builders
│   ├── response-verifier.ts          # Base class (200/401/403/404/422 checks)
│   ├── api-utils.ts                  # Shared validators + list helpers
│   └── <feature>-api.ts              # Feature API classes
├── specs/api/<feature>-api.spec.ts   # Spec files
└── testdata/api/
    ├── <feature>-test-data.ts        # Query params, test constants
    └── <feature>-response-types.ts   # TypeScript interfaces
```

Names in angle brackets are placeholders. Keep whatever casing and hyphenation the project already uses for file names, classes, and fixtures.

## Templates

The workflows below reference these starting-point files. They show the expected shape — adapt them to your endpoint's actual contract and your project's actual aliases and paths, don't copy literally. Paths in this table are relative to this skill's own directory — in an installed project they live under `.claude/skills/api-test-automation/templates/`, which is where you `Read` them from.

| Template                         | Purpose                                      |
| -------------------------------- | -------------------------------------------- |
| `templates/response-verifier.ts` | Base class for HTTP status code verification |
| `templates/api-class.ts`         | GET list/detail/filter API class pattern     |
| `templates/api-utils.ts`         | Shared validators and list-response helpers  |
| `templates/spec.ts`              | Combined list + detail spec template         |
| `templates/response-types.ts`    | Response interface definitions               |
| `templates/test-data.ts`         | Test data constants and query types          |
| `templates/api-endpoints.ts`     | Endpoint URL builder patterns                |

Templates stay as real `.ts` files — copyable and easy to reuse. Never inline them into markdown code fences. They include `// @ts-nocheck` because they contain intentional placeholders (`Feature*` names, example endpoint paths, aliases that resolve only inside a consuming project); remove that directive after copying so the final code is type-checked.

## Key Rules

1. **Inspect before you create** — before adding response types, endpoints, API classes, specs, or test data, search for existing files covering the same endpoint or feature, and follow the project's structure from Step 0
2. **Build endpoint URLs in one place** — reuse the project's endpoints module; add missing builders there and never hardcode URLs in API classes or specs
3. **Keep endpoint builders generic** — add only the base endpoint builder; do not create separate helpers for invalid query values. Valid and invalid params belong in the feature test-data file and pass through the same builder from the spec.
4. **Extend the project's response-verifier base class** — for 401/403/404/422 checks. If the project has none, add one (see `templates/response-verifier.ts`).
5. **Separate ACTION from ASSERT methods** — no combined `runAndVerify*`
6. **Use assertions, not throws** — `expect(actual, message)` with a descriptive message as the second argument
7. **Reuse test data** — check for existing constants before creating new ones
8. **Use `test.step` for response-derived data** — especially when extracting a valid ID or item from a list response for a follow-up request
9. **Tag tests using the project's vocabulary** — `@api @<feature>` plus whatever suite tags the repo already uses (e.g. `@smoke`, `@reg`). Some projects also gate environment-safe scenarios behind a tag such as `@prod` — adopt the project's convention rather than inventing one.
10. **Label test type** — add a one-line `// POSITIVE TEST` or `// NEGATIVE TEST` comment above each test case to clarify intent

## Workflow: Write New API Tests

```
- [ ] Complete Step 0 — aliases, existing API files, endpoint module, auth, tags, fixture file
- [ ] Check for existing API/spec/testdata files covering the same endpoint or feature
- [ ] Reuse existing response types, endpoint builders, API classes, fixtures, and test data where available
- [ ] Create response types for the feature only if missing
- [ ] Create feature test data only if missing
- [ ] Add endpoint builders to the project's endpoints module only if missing
- [ ] Add or reuse shared helpers (validators, first-list-item, assertion-context formatting) when generic across API classes
- [ ] Create or update the feature API class
- [ ] Register the API class in the project's fixture file when the project uses fixture-based page objects — required for every newly created API class; skip it when a fixture for that class already exists
- [ ] Create or update the feature spec
- [ ] Validate with the project's lint and test commands
```

## References

| Reference                           | Content                                                    |
| ----------------------------------- | ---------------------------------------------------------- |
| `references/api-class-pattern.md`   | API class conventions, anti-patterns, fixture registration |
| `references/test-coverage.md`       | Coverage requirements by endpoint type                     |
| `references/test-data-selection.md` | Test data priority rules, `test.step` usage                |
