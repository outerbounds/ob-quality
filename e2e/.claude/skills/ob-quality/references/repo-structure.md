# Repository Structure

## Domain Map

| Artifact       | Models                             | Packages                             |
| -------------- | ---------------------------------- | ------------------------------------ |
| Fixture        | `tests/fixtures/models/fixture.ts` | `tests/fixtures/packages/fixture.ts` |
| Fixture import | `@models-fixture`                  | `@packages-fixture`                  |
| Page objects   | `tests/pages/models/`              | `tests/pages/packages/`              |
| Test data      | `tests/testdata/models/`           | `tests/testdata/packages/`           |
| Specs          | `tests/specs/models/`              | `tests/specs/packages/`              |
| Test plans     | `tests/test-plans/models/`         | `tests/test-plans/packages/`         |

## Ownership Rules

- A model plan may create or update files only in the Models column.
- A package plan may create or update files only in the Packages column.
- Search the selected domain recursively before considering shared infrastructure.
- Do not create TypeScript files directly in `tests/fixtures/`, `tests/pages/`, `tests/testdata/`, or `tests/specs/`.
- Do not import package-owned pages, data, or fixtures from model code. Apply the inverse rule to package code.
- Keep feature data out of specs and page objects. Put it in the selected domain's test-data directory.
- Keep locators, actions, and assertions in the selected domain's page objects.
- Register page objects only in the selected domain's fixture.
- Specs import `test` from the selected domain fixture alias, never `@fixture`, `@playwright/test`, or the opposite domain fixture.

## Fixture Pattern

Both domain fixtures import `test` from `@page-setup`, which resolves to `test-setup/page-setup.ts`. That shared base owns the automatic `setPage(page)` hook.

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

Use the equivalent `@pages/packages/...` import in the package fixture. Preserve existing fixture registrations when adding another page object.

## Naming And Imports

- Use lowercase hyphenated TypeScript basenames.
- Use `@pages/models/*` or `@pages/packages/*` for page objects.
- Use `@testdata/models/*` or `@testdata/packages/*` for test data.
- Use `@models-fixture` or `@packages-fixture` in specs.
- Use `@page-setup` when a fixture needs the shared base test.
- Keep all paths in plans relative to `playwright.config.ts`.

## Shared Infrastructure

Only authentication/session setup and framework-wide hooks belong in `tests/storage-setup/` and `test-setup/`. Domain feature logic must not be moved there to bypass ownership rules.

## Validation

Run `npm run validate:architecture` after creating, moving, healing, or refactoring test artifacts. It rejects flat TypeScript artifacts, cross-domain imports, and specs using the wrong domain fixture.
