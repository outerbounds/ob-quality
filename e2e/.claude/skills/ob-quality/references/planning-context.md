# Planning Context

Read [Repository structure](./repo-structure.md) immediately after this file and apply its domain map to every planned artifact.

## Domain Classification

| Domain   | Typical request vocabulary                                                     | Plan location                | Coverage location                   |
| -------- | ------------------------------------------------------------------------------ | ---------------------------- | ----------------------------------- |
| Models   | model, model details, model version, model search, model metadata              | `tests/test-plans/models/`   | `tests/specs/models/**/*.spec.ts`   |
| Packages | package, package details, package version, package search, channel, dependency | `tests/test-plans/packages/` | `tests/specs/packages/**/*.spec.ts` |

Treat explicit target paths as authoritative. Vocabulary is only a fallback. Ask the user when a request spans both domains without a clear split or when classification remains ambiguous.

## Coverage Discovery

No generated coverage index is configured. Use live, domain-scoped discovery:

1. Search `tests/test-plans/<domain>/**/*.md` for an existing plan covering the feature.
2. Search `tests/specs/<domain>/**/*.spec.ts` and read matching `describe` and `test` titles.
3. Search `tests/pages/<domain>/**/*.ts`, `tests/testdata/<domain>/**/*.ts`, and the domain fixture for reusable implementation.
4. Do not use the opposite domain to claim coverage.

## Plan Output Contract

- Save model plans under `tests/test-plans/models/`.
- Save package plans under `tests/test-plans/packages/`.
- Set `Target spec` under `tests/specs/<domain>/`.
- Reference test data under `tests/testdata/<domain>/`.
- Name the selected fixture alias in implementation notes.
- A multi-domain request produces separate plans unless the user explicitly defines one cross-domain journey.

Use existing suite tags from sibling specs. When no sibling specs exist, use only tags required by the request or established by the distributed planner rules.
