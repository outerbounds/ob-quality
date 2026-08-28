---
applyTo: 'tests/**,test-setup/**,playwright.config.ts'
---

# Playwright Tests

Use `@anaconda/playwright-utils` and repository POM conventions. Prefer library helpers over raw Playwright APIs whenever helper coverage exists.

## Structure

- Specs live in `tests/specs/**` and import only `test` from `@fixture`.
- Page objects live in `tests/pages/**`; they own all actions, locators, assertions, and data reads.
- Fixtures live in `tests/fixtures/fixture.ts`; register every new page object before using it in specs.
- Test data lives in `tests/testdata/**`; avoid inline credentials, URLs, or repeated static values.
- Shared setup belongs in `test.beforeEach`; tests should be wrapped in `test.describe` with an appropriate tag such as `@smoke` or `@reg`.

## Imports And Utilities

- Use one barrel import from `@anaconda/playwright-utils` for library helpers and constants.
- Never import `test` from `@playwright/test` in specs; use `@fixture`.
- Use `gotoURL`, `click`, `clickAndNavigate`, `fill`, `pressSequentially`, and `expect*` helpers from the library.
- Use `clickAndNavigate()` only for clicks that navigate; do not add `waitForPageLoadState` after it.
- Use `logger` only in page objects when logging is needed; never use `console.log`.
- Do not manually call `setPage(page)` when using the shared fixture.
- Keep utility imports sorted.

## Page Object Rules

- Keep selectors private.
- Static string selectors are fine for stable CSS/XPath selectors.
- Use arrow functions for locators built with library calls so `getPage()` is resolved during the test.
- Action methods perform interactions and are named with verbs.
- Assertion methods are named `verify*` and contain assertions.
- Data retrieval methods are named `get*` and do not assert.
- Specs should call page object methods only; no `click`, `fill`, `expect*`, raw `expect`, or `page.*` in spec bodies.

## Locators

Follow the locator priority in `CLAUDE.md` and `.claude/skills/anaconda-playwright-utils/references/locators.md`.

1. `data-qa-id` - use `getLocatorByTestId('value')`.
2. Other `data-*` attributes such as `data-testid` or `data-test` - use CSS selectors such as `'[data-testid="value"]'`.
3. Stable `id` - use `'#value'`.
4. Stable `name` - use `'[name="value"]'`.
5. XPath or CSS with stable unique attributes.
6. Role, label, placeholder, or text locators only when no stable attribute exists.
7. Structural XPath/CSS only as a last resort.

If page inspection reveals a stable `data-qa-id` or other `data-*` attribute, use it instead of role or text. Prefer ancestor scoping before positional selectors. Avoid `.nth()`, `.first()`, and `.last()`; if no stable scoping alternative exists, add a short comment.

## Assertions

- Every assertion must include a descriptive message.
- Prefer library assertions such as `expectElementToBeVisible`, `expectElementToContainText`, and `expectPageToHaveURL`.
- For soft assertions, call `assertAllSoftAssertions(test.info())` immediately after the page object method that used them.
- Prefer stable element locators over text-only lookups.
- Keep assertions in `verify*` methods unless a utility method is explicitly designed for data retrieval.

## Review Checklist

Flag these as findings:

- Raw Playwright APIs in test code where a library utility exists.
- Spec files containing actions, assertions, locators, or `page.*`.
- Missing fixture registration for a new page object.
- Role/text locator kept when a stable attribute exists.
- Unjustified `.nth()`, `.first()`, or `.last()`.
- Assertion without a message.
- Hardcoded credentials, URLs, or repeated static test data outside `tests/testdata/**`.
- `test.skip` or TODO without a clear issue/ticket reference.
- Duplicate flows that should be shared through a fixture, helper, or page object method.
- New test setup logic added to specs instead of fixture or page object layers.
