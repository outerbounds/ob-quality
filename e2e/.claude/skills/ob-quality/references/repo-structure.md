# Repository Structure

## Domain Map

| Artifact       | Models                             | Packages                             | Perimeters                             |
| -------------- | ---------------------------------- | ------------------------------------ | -------------------------------------- |
| Fixture        | `tests/fixtures/models/fixture.ts` | `tests/fixtures/packages/fixture.ts` | `tests/fixtures/perimeters/fixture.ts` |
| Fixture import | `@models-fixture`                  | `@packages-fixture`                  | `@perimeters-fixture`                  |
| Page objects   | `tests/pages/models/`              | `tests/pages/packages/`              | `tests/pages/perimeters/`              |
| Test data      | `tests/testdata/models/`           | `tests/testdata/packages/`           | `tests/testdata/perimeters/`           |
| Specs          | `tests/specs/models/`              | `tests/specs/packages/`              | `tests/specs/perimeters/`              |
| Test plans     | `tests/test-plans/models/`         | `tests/test-plans/packages/`         | `tests/test-plans/perimeters/`         |

## Ownership Rules

- A model plan may create or update files only in the Models column.
- A package plan may create or update files only in the Packages column.
- A perimeter plan may create or update files only in the Perimeters column.
- Search the selected domain recursively before considering shared infrastructure.
- Do not create TypeScript files directly in `tests/fixtures/`, `tests/pages/`, `tests/testdata/`, or `tests/specs/`.
- Do not import pages, data, or fixtures owned by another domain (models, packages, perimeters).
- Keep feature data out of specs and page objects. Put it in the selected domain's test-data directory.
- Keep locators, actions, and assertions in the selected domain's page objects.
- Register page objects only in the selected domain's fixture.
- Specs import `test` from the selected domain fixture alias, never `@fixture`, `@playwright/test`, or another domain's fixture.

## Fixture Pattern

Every domain fixture imports `test` from `@page-setup`, which resolves to `test-setup/page-setup.ts`. That shared base owns the automatic `setPage(page)` hook.

When registering a page object, extend the existing domain fixture in place:

```typescript
import { test as baseTest, expect } from '@page-setup';
import { ExamplePage } from '@pages/models/example-page';

type ModelFixtures = {
  examplePage: ExamplePage;
};

export const test = baseTest.extend<ModelFixtures>({
  examplePage: async ({}, use) => {
    await use(new ExamplePage());
  },
});

export { expect };
```

Use the equivalent `@pages/packages/...` or `@pages/perimeters/...` import in the package or perimeter fixture. Preserve existing fixture registrations when adding another page object.

## Naming And Imports

- Use lowercase hyphenated TypeScript basenames.
- Use `@pages/models/*`, `@pages/packages/*`, or `@pages/perimeters/*` for page objects.
- Use `@testdata/models/*`, `@testdata/packages/*`, or `@testdata/perimeters/*` for test data.
- Use `@models-fixture`, `@packages-fixture`, or `@perimeters-fixture` in specs.
- Use `@page-setup` when a fixture needs the shared base test.
- Keep all paths in plans relative to `playwright.config.ts`.

## Shared Infrastructure

Only authentication/session setup and framework-wide hooks belong in `tests/storage-setup/` and `test-setup/`. Domain feature logic must not be moved there to bypass ownership rules.

## Validation

Run `npm run validate:architecture` after creating, moving, healing, or refactoring test artifacts. It rejects flat TypeScript artifacts, cross-domain imports, and specs using the wrong domain fixture.
