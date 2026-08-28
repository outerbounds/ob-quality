---
name: ob-quality
description: 'Repository routing for ob-quality Playwright planning, generation, healing, and review. Use before working with model or package tests to select the correct domain folders, fixture alias, test data, page objects, specs, and test plans.'
user-invocable: false
---

# OB Quality Project Router

This repository separates Playwright artifacts by product domain. These rules override generic flat-folder and single-fixture examples in distributed agents and skills.

## Intent Routing

| Intent                               | Load first                                             | Then load                                                   |
| ------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------- |
| Plan tests or survey coverage        | [Planning context](./references/planning-context.md)   | [Repository structure](./references/repo-structure.md)      |
| Generate or edit test code           | [Repository structure](./references/repo-structure.md) | `anaconda-playwright-utils` references required by the task |
| Heal, run, review, or refactor tests | [Repository structure](./references/repo-structure.md) | Existing plan and owning domain files                       |

## Required Routing Decision

Before searching tests, writing a plan, or changing test code:

1. Classify the work as `models` or `packages` from the request, target URL, existing plan, or existing spec path.
2. Keep every domain-owned artifact in that domain's subtree.
3. If the domain remains ambiguous, ask one focused question before writing files.
4. Treat `test-setup/` and `tests/storage-setup/` as shared infrastructure only; do not place feature code there.

Do not edit distributed agent or common-skill files to encode repository behavior. This project skill is the durable override used across package upgrades.
