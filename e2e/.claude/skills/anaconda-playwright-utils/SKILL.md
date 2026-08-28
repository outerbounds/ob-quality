---
name: anaconda-playwright-utils
description: >
  Use this skill whenever writing, editing, or reviewing Playwright TypeScript tests that use the @anaconda/playwright-utils library.
  Trigger on requests like: "write a test for...", "create a page object for...", "add a spec file for...", "how do I click/fill/assert in Playwright?", "write a test that navigates to...", "generate tests for this page", or any task involving Playwright test code in a project that uses @anaconda/playwright-utils.
  This skill ensures correct use of the library's utility functions (click, fill, gotoURL, expectElementToBeVisible, etc.) instead of raw Playwright API calls, correct class-based Page Object Model structure, proper fixture wiring, locator priority, and all test writing conventions.
allowed-tools:
  - Bash
  - Glob
  - Read
  - Write
  - Edit
version: 1.17.1
---

# @anaconda/playwright-utils

A Playwright TypeScript utility library that simplifies browser automation with reusable helper functions for actions, assertions, locators, element queries, page management, and API requests.

## Setup Requirement

The library uses a singleton `page` pattern. `setPage(page)` must be called once per test before any utility function runs — but **the fixture handles this automatically**. When you import `test` from `@fixture`, `setPage(page)` is called before every test without any manual setup.

```typescript
import { test } from '@fixture'; // setPage(page) is called automatically — nothing else needed
```

Only call `setPage(page)` manually if you are NOT using the fixture (e.g., raw `@playwright/test` in a standalone script).

## Import Patterns

### Main export (all utilities)

```typescript
import { click, expectElementToBeVisible, fill, getLocator, logger } from '@anaconda/playwright-utils';
```

> **`logger`** is a Winston-based logger exported from the library. Use it in page objects only for informational or warning messages — never in spec files and never with `console.log`.

### Subpath exports (tree-shakable)

```typescript
import { click, clickAndNavigate, fill } from '@anaconda/playwright-utils/action-utils';
import { expectElementToBeVisible, expectPageToHaveURL } from '@anaconda/playwright-utils/assert-utils';
import { getLocator, getLocatorByRole, getLocatorByText } from '@anaconda/playwright-utils/locator-utils';
import { getText, isElementVisible, waitForElementToBeVisible } from '@anaconda/playwright-utils/element-utils';
import { getPage, gotoURL, setPage, switchPage } from '@anaconda/playwright-utils/page-utils';
import { getRequest, postRequest } from '@anaconda/playwright-utils/api-utils';
import { ACTION_TIMEOUT, SMALL_TIMEOUT, STANDARD_TIMEOUT, TEST_TIMEOUT } from '@anaconda/playwright-utils/constants';
import { ClickOptions, FillOptions } from '@anaconda/playwright-utils/types';
import { logger } from '@anaconda/playwright-utils'; // named export
```

## Core Pattern

Most functions accept `string | Locator` as their first argument (the `input` parameter). This means you can pass either a CSS/XPath selector string or a Playwright `Locator` object.

Standard action functions enforce **visibility by default** (`onlyVisible: true`); override with `{ onlyVisible: false }`. Exceptions (canonical list): the JS helpers (`clickByJS`, `clearByJS`), `scrollLocatorIntoView`, and the alert helpers accept only `{ timeout }` (`acceptAlert` additionally accepts `promptText`) and do not filter to visible elements. For alert helpers, `timeout` bounds both the trigger click and dialog wait; trigger click failures are rethrown unchanged instead of being reported as dialog timeouts.

Most functions accept an optional `options` object as the last parameter, extending Playwright's native options with:

- `onlyVisible?: boolean` - Filter to visible elements only (default: `true` for actions)
- `stable?: boolean` - Wait for element position to stabilize before acting
- `loadState?: WaitForLoadStateOptions` - Wait for load state after navigation actions
- `soft?: boolean` - Use soft assertions (won't stop test on failure)

## Module Reference

115 Playwright utility functions across six modules — the tables below are the canonical count and name list for utility wrappers. Additional public exports that are not Playwright wrappers are documented separately after the utility tables.

### Action Utils (`action-utils`)

Interact with page elements.

| Function                | Signature                                       | Description                                   |
| ----------------------- | ----------------------------------------------- | --------------------------------------------- |
| `click`                 | `(input, options?: ClickOptions)`               | Click an element                              |
| `clickAndNavigate`      | `(input, options?: ClickOptions)`               | Click and wait for navigation                 |
| `fill`                  | `(input, value: string, options?: FillOptions)` | Fill an input field                           |
| `fillAndEnter`          | `(input, value, options?)`                      | Fill and press Enter                          |
| `fillAndTab`            | `(input, value, options?)`                      | Fill and press Tab                            |
| `pressSequentially`     | `(input, value, options?)`                      | Type character by character                   |
| `pressPageKeyboard`     | `(key, options?)`                               | Press key on the page                         |
| `pressLocatorKeyboard`  | `(input, key, options?)`                        | Press key on an element                       |
| `clear`                 | `(input, options?)`                             | Clear an input field                          |
| `check`                 | `(input, options?)`                             | Check a checkbox/radio                        |
| `uncheck`               | `(input, options?)`                             | Uncheck a checkbox/radio                      |
| `selectByValue`         | `(input, value, options?)`                      | Select dropdown by value                      |
| `selectByValues`        | `(input, values[], options?)`                   | Multi-select by values                        |
| `selectByText`          | `(input, text, options?)`                       | Select dropdown by label text                 |
| `selectByIndex`         | `(input, index, options?)`                      | Select dropdown by index                      |
| `hover`                 | `(input, options?)`                             | Hover over an element                         |
| `focus`                 | `(input, options?)`                             | Focus an element                              |
| `blur`                  | `(input, options?)`                             | Remove focus from an element                  |
| `dragAndDrop`           | `(input, dest, options?)`                       | Drag and drop                                 |
| `doubleClick`           | `(input, options?)`                             | Double-click an element                       |
| `downloadFile`          | `(input, savePath, options?)`                   | Click to download, save file, return filename |
| `uploadFiles`           | `(input, path, options?)`                       | Upload files to an input                      |
| `scrollLocatorIntoView` | `(input, options?)`                             | Scroll element into view                      |
| `clickByJS`             | `(input, options?)`                             | Click via JavaScript (bypasses visibility)    |
| `clearByJS`             | `(input, options?)`                             | Clear input via JavaScript                    |
| `acceptAlert`           | `(input, options?)`                             | Click, accept dialog, return message          |
| `dismissAlert`          | `(input, options?)`                             | Click, dismiss dialog, return message         |
| `getAlertText`          | `(input, options?)`                             | Click, get dialog text, dismiss               |

### Assert Utils (`assert-utils`)

Playwright auto-retrying assertions.

| Function                          | Signature                          | Description                          |
| --------------------------------- | ---------------------------------- | ------------------------------------ |
| `expectElementToBeVisible`        | `(input, options?: ExpectOptions)` | Assert element is visible            |
| `expectElementToBeHidden`         | `(input, options?)`                | Assert element is hidden/not in DOM  |
| `expectElementToBeAttached`       | `(input, options?)`                | Assert element is in DOM             |
| `expectElementToBeInViewport`     | `(input, options?)`                | Assert element is in viewport        |
| `expectElementNotToBeInViewport`  | `(input, options?)`                | Assert element is not in viewport    |
| `expectElementToBeChecked`        | `(input, options?)`                | Assert checkbox is checked           |
| `expectElementNotToBeChecked`     | `(input, options?)`                | Assert checkbox is not checked       |
| `expectElementToBeDisabled`       | `(input, options?)`                | Assert element is disabled           |
| `expectElementToBeEnabled`        | `(input, options?)`                | Assert element is enabled            |
| `expectElementToBeEditable`       | `(input, options?)`                | Assert element is editable           |
| `expectElementToHaveText`         | `(input, text, options?)`          | Assert element text equals           |
| `expectElementNotToHaveText`      | `(input, text, options?)`          | Assert element text does not equal   |
| `expectElementToContainText`      | `(input, text, options?)`          | Assert element text contains         |
| `expectElementNotToContainText`   | `(input, text, options?)`          | Assert element text does not contain |
| `expectElementToHaveValue`        | `(input, text, options?)`          | Assert input has value               |
| `expectElementToHaveValues`       | `(input, texts[], options?)`       | Assert multi-select has values       |
| `expectElementValueToBeEmpty`     | `(input, options?)`                | Assert input is empty                |
| `expectElementValueNotToBeEmpty`  | `(input, options?)`                | Assert input is not empty            |
| `expectElementToHaveAttribute`    | `(input, attr, value, options?)`   | Assert element has attribute value   |
| `expectElementToContainAttribute` | `(input, attr, value, options?)`   | Assert attribute contains value      |
| `expectElementToHaveCount`        | `(input, count, options?)`         | Assert element count                 |
| `expectElementToHaveClass`        | `(input, expected, options?)`      | Assert element class (string=exact)  |
| `expectElementToHaveCSS`          | `(input, name, value, options?)`   | Assert element computed CSS value    |
| `expectElementToHaveId`           | `(input, id, options?)`            | Assert element id                    |
| `expectPageToHaveURL`             | `(urlOrRegExp, options?)`          | Assert page URL equals/matches       |
| `expectPageToContainURL`          | `(urlOrRegExp, options?)`          | Assert page URL contains pattern     |
| `expectPageToHaveTitle`           | `(titleOrRegExp, options?)`        | Assert page title                    |
| `expectPageSizeToBeEqualTo`       | `(count, options?)`                | Assert number of open pages          |
| `expectAlertToHaveText`           | `(input, text, options?)`          | Assert alert text equals             |
| `expectAlertToMatchText`          | `(input, text, options?)`          | Assert alert text matches            |
| `assertAllSoftAssertions`         | `(testInfo)`                       | Verify all soft assertions passed    |

### Additional Public Exports

These exports are not counted in the 115 Playwright utility functions.

| Export         | Signature | Description                                        |
| -------------- | --------- | -------------------------------------------------- |
| `escapeRegExp` | `(value)` | Escape regex metacharacters for literal RegExp use |

### Locator Utils (`locator-utils`)

Find elements on the page.

| Function                  | Signature                           | Description                                                                                    |
| ------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| `getLocator`              | `(input, options?: LocatorOptions)` | Get locator from selector or Locator                                                           |
| `getVisibleLocator`       | `(input, options?)`                 | Get locator filtered to visible elements                                                       |
| `getLocatorByTestId`      | `(testId, options?)`                | Get locator by the configured `testIdAttribute` (`data-qa-id` by default in Anaconda projects) |
| `getLocatorByText`        | `(text, options?)`                  | Get locator by text content                                                                    |
| `getLocatorByRole`        | `(role, options?)`                  | Get locator by ARIA role                                                                       |
| `getLocatorByLabel`       | `(text, options?)`                  | Get locator by label                                                                           |
| `getLocatorByPlaceholder` | `(text, options?)`                  | Get locator by placeholder                                                                     |
| `getLocatorByTitle`       | `(text, options?)`                  | Get locator by `title` attribute                                                               |
| `getLocatorByAltText`     | `(text, options?)`                  | Get locator by `alt` text (e.g. images)                                                        |
| `getAllLocators`          | `(input, options?)`                 | Get all matching locators                                                                      |
| `getFrame`                | `(frameSelector, options?)`         | Get a Frame by name/URL                                                                        |
| `getFrameLocator`         | `(frameInput)`                      | Get a FrameLocator                                                                             |
| `getLocatorInFrame`       | `(frameInput, input)`               | Get locator within a frame                                                                     |

### Element Utils (`element-utils`)

Retrieve data and check element state.

| Function                          | Signature                     | Description                                       |
| --------------------------------- | ----------------------------- | ------------------------------------------------- |
| `getText`                         | `(input, options?)`           | Get inner text (trimmed)                          |
| `getAllTexts`                     | `(input, options?)`           | Get all inner texts                               |
| `getInputValue`                   | `(input, options?)`           | Get input value (trimmed)                         |
| `getAllInputValues`               | `(input, options?)`           | Get all input values                              |
| `getAttribute`                    | `(input, attrName, options?)` | Get attribute value                               |
| `getLocatorCount`                 | `(input, options?)`           | Get count of matching elements                    |
| `isElementAttached`               | `(input, options?)`           | Check if element is in DOM                        |
| `isElementVisible`                | `(input, options?)`           | Check if element is visible                       |
| `isElementHidden`                 | `(input, options?)`           | Check if element is hidden                        |
| `isElementChecked`                | `(input, options?)`           | Check if checkbox is checked                      |
| `isElementEnabled`                | `(input, options?)`           | Check if element is enabled                       |
| `isElementDisabled`               | `(input, options?)`           | Check if element is disabled                      |
| `waitForElementToBeStable`        | `(input, options?)`           | Wait for element position to stabilize            |
| `waitForElementToBeVisible`       | `(input, options?)`           | Wait for element to be visible                    |
| `waitForElementToBeHidden`        | `(input, options?)`           | Wait for element to be hidden                     |
| `waitForElementToBeAttached`      | `(input, options?)`           | Wait for element to attach to DOM                 |
| `waitForElementToBeDetached`      | `(input, options?)`           | Wait for element to detach from DOM               |
| `waitForFirstElementToBeAttached` | `(input, options?)`           | Wait for the first of multiple elements to attach |

### Page Utils (`page-utils`)

Page management and navigation.

| Function               | Signature                        | Description                                |
| ---------------------- | -------------------------------- | ------------------------------------------ |
| `getPage`              | `()`                             | Get current Page instance                  |
| `setPage`              | `(pageInstance)`                 | Set current Page instance                  |
| `getContext`           | `()`                             | Get current BrowserContext                 |
| `getAllPages`          | `()`                             | Get all pages in context                   |
| `switchPage`           | `(winNum, options?)`             | Switch to page by index (1-based)          |
| `switchToDefaultPage`  | `()`                             | Switch to first page                       |
| `closePage`            | `(winNum?)`                      | Close page by index                        |
| `gotoURL`              | `(path, options?)`               | Navigate to URL                            |
| `getURL`               | `(options?)`                     | Get current page URL                       |
| `waitForPageLoadState` | `(options?)`                     | Wait for page load state                   |
| `reloadPage`           | `(options?)`                     | Reload current page                        |
| `goBack`               | `(options?)`                     | Navigate back                              |
| `waitForURL`           | `(url, options?)`                | Wait for the URL to match (SPA/redirects)  |
| `waitForResponse`      | `(urlOrPredicate, options?)`     | Wait for a matching network response       |
| `waitForRequest`       | `(urlOrPredicate, options?)`     | Wait for a matching network request        |
| `waitForFunction`      | `(pageFunction, arg?, options?)` | Wait for an in-page condition to be truthy |
| `wait`                 | `(ms)`                           | Wait for specified milliseconds            |
| `getWindowSize`        | `()`                             | Get browser window dimensions              |
| `saveStorageState`     | `(path?)`                        | Save cookies/storage to file               |

### API Utils (`api-utils`)

HTTP requests via Playwright's API context.

| Function               | Signature         | Description               |
| ---------------------- | ----------------- | ------------------------- |
| `getAPIRequestContext` | `()`              | Get the APIRequestContext |
| `getRequest`           | `(url, options?)` | Send GET request          |
| `postRequest`          | `(url, options?)` | Send POST request         |
| `putRequest`           | `(url, options?)` | Send PUT request          |
| `patchRequest`         | `(url, options?)` | Send PATCH request        |
| `deleteRequest`        | `(url, options?)` | Send DELETE request       |

## Constants

Timeout constants for use in `options.timeout` overrides and `playwright.config.ts`. Import from the main entry or the `./constants` subpath.

```typescript
import { SMALL_TIMEOUT, STANDARD_TIMEOUT } from '@anaconda/playwright-utils';
// or tree-shakable:
import {
  ACTION_TIMEOUT,
  BIG_TIMEOUT,
  SMALL_TIMEOUT,
  STANDARD_TIMEOUT,
  TEST_TIMEOUT,
} from '@anaconda/playwright-utils/constants';
```

| Constant             | Value | Use Case                                                            |
| -------------------- | ----- | ------------------------------------------------------------------- |
| `INSTANT_TIMEOUT`    | 1s    | Immediate checks (element already visible)                          |
| `SMALL_TIMEOUT`      | 5s    | Quick state changes — default for `waitForElementToBe*` waits       |
| `STANDARD_TIMEOUT`   | 15s   | Slower interactions — default navigation wait in `clickAndNavigate` |
| `BIG_TIMEOUT`        | 30s   | Slow API responses, heavy page loads                                |
| `MAX_TIMEOUT`        | 60s   | Very slow operations                                                |
| `EXPECT_TIMEOUT`     | 5s    | `playwright.config.ts` → `expect.timeout`                           |
| `ACTION_TIMEOUT`     | 5s    | `playwright.config.ts` → `use.actionTimeout`                        |
| `NAVIGATION_TIMEOUT` | 30s   | `playwright.config.ts` → `use.navigationTimeout`                    |
| `TEST_TIMEOUT`       | 120s  | `playwright.config.ts` → `timeout`                                  |

## Example Test

Tests are always structured with three files: a **Page Object class**, a **Fixture** registration, and a **Spec** file. All actions and assertions live in the page object class — the spec only calls page object methods via injected fixtures.

### Page Object Class (`tests/pages/login-page.ts`)

```typescript
import {
  click,
  clickAndNavigate,
  expectElementToBeAttached,
  expectElementToBeVisible,
  fill,
  getLocator,
  getLocatorByPlaceholder,
  getLocatorByRole,
  gotoURL,
} from '@anaconda/playwright-utils';
import { urlData } from '@testdata/<url-module>'; // NOTE: replace <url-module> with your project URL testdata module (under tests/testdata/)
import { invalidUser, validUser } from '@testdata/<user-module>'; // NOTE: replace <user-module> with your project user testdata module (under tests/testdata/)

export class LoginPage {
  // Static selectors — raw CSS/XPath strings (no library call at class instantiation)
  private readonly usernameInput = '#username';
  private readonly welcomeMessage = '[data-test="welcome-message"]';
  private readonly errorMessage = '[data-test="error-message"]';

  // Arrow functions — any library locator call (any tier); defers getPage() to test execution
  private readonly passwordInput = () => getLocator('#password').or(getLocatorByPlaceholder('Password'));
  private readonly loginButton = () => getLocatorByRole('button', { name: 'Login' });

  async navigateToLoginPage(): Promise<void> {
    await gotoURL(urlData.loginPageUrl);
  }

  async loginWithValidCredentials(username = validUser.username, password = validUser.pwd): Promise<void> {
    await fill(this.usernameInput, username);
    await fill(this.passwordInput(), password);
    await clickAndNavigate(this.loginButton());
  }

  async loginWithInvalidCredentials(username = invalidUser.username, password = invalidUser.pwd): Promise<void> {
    await fill(this.usernameInput, username);
    await fill(this.passwordInput(), password);
    await click(this.loginButton());
  }

  async verifyLoginSuccessful(): Promise<void> {
    await expectElementToBeAttached(this.welcomeMessage, 'User should be logged in successfully');
  }

  async verifyInvalidLoginError(): Promise<void> {
    await expectElementToBeVisible(this.errorMessage, 'Error message should be displayed for invalid credentials');
  }

  async verifyLoginPageIsDisplayed(): Promise<void> {
    await expectElementToBeVisible(this.usernameInput, 'Login page should be displayed');
  }
}
```

### Fixture Registration (`tests/fixtures/fixture.ts`)

```typescript
import { test as baseTest } from '@anaconda/playwright-utils';
import { LoginPage } from '@pages/login-page';
import { ProductsPage } from '@pages/products-page';

export const test = baseTest.extend<{
  loginPage: LoginPage;
  productsPage: ProductsPage;
}>({
  loginPage: async ({}, use) => {
    await use(new LoginPage());
  },
  productsPage: async ({}, use) => {
    await use(new ProductsPage());
  },
});
```

### Spec File

```typescript
import { test } from '@fixture';

test.describe('Login @smoke', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.navigateToLoginPage();
  });

  test('should login with valid credentials', async ({ loginPage }) => {
    await loginPage.loginWithValidCredentials();
    await loginPage.verifyLoginSuccessful();
  });

  test('should show error with invalid credentials', async ({ loginPage }) => {
    await loginPage.loginWithInvalidCredentials();
    await loginPage.verifyInvalidLoginError();
  });
});
```

**Key rules:**

- Import `test` from `@fixture` — this auto-calls `setPage(page)` before each test (no manual setup needed)
- Page objects are classes registered in `fixture.ts` and injected via destructuring: `async ({ loginPage }) => {}`
- **No actions or assertions in spec files** — `fill`, `click`, `gotoURL`, `expectElementToBeVisible`, etc. all belong in the page object class; spec files only call page object methods
- **Separate actions from assertions** — action methods contain interactions only; `verify*` methods contain `expect*` only. Click→navigate flows use `click*` + `verify*` pairs — never bundled `navigateTo*` methods mixing `clickAndNavigate` with URL assertions
- **No raw `expect()` in spec files** — use `verify*` methods in page objects instead
- **Use `logger` from `@anaconda/playwright-utils` in page objects only** — never in specs, and never `console.log`
- Wrap all tests in a `test.describe` block with a descriptive name and tag (`@smoke`, `@reg`)
- Use `test.beforeEach` for shared setup (navigation, login) that every test in the describe needs

## CLI-to-Library Code Mapping

When using `playwright-cli` to explore pages, translate the generated Playwright code to `@anaconda/playwright-utils` equivalents. The same table covers raw Playwright API calls found in existing tests when healing:

| playwright-cli Generated Code                           | @anaconda/playwright-utils Equivalent                                                                                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `await page.goto(url)`                                  | `await gotoURL(url)`                                                                                                                                                   |
| `await page.goBack()`                                   | `await goBack()`                                                                                                                                                       |
| `await page.reload()`                                   | `await reloadPage()`                                                                                                                                                   |
| `await page.locator(sel).click()`                       | `await click(sel)`                                                                                                                                                     |
| `await page.locator(sel).click()` + navigation          | `await clickAndNavigate(sel)`                                                                                                                                          |
| `await page.locator(sel).dblclick()`                    | `await doubleClick(sel)`                                                                                                                                               |
| `await page.locator(sel).fill(val)`                     | `await fill(sel, val)`                                                                                                                                                 |
| `await page.locator(sel).fill(val)` + Enter             | `await fillAndEnter(sel, val)`                                                                                                                                         |
| `await page.locator(sel).clear()`                       | `await clear(sel)`                                                                                                                                                     |
| `await page.locator(sel).clear()` (when standard fails) | `await clearByJS(sel)`                                                                                                                                                 |
| `await page.locator(sel).hover()`                       | `await hover(sel)`                                                                                                                                                     |
| `await page.locator(sel).check()`                       | `await check(sel)`                                                                                                                                                     |
| `await page.locator(sel).uncheck()`                     | `await uncheck(sel)`                                                                                                                                                   |
| `await page.locator(sel).selectOption(val)`             | `await selectByValue(sel, val)`                                                                                                                                        |
| `await page.locator(sel).dragTo(dest)`                  | `await dragAndDrop(sel, dest)`                                                                                                                                         |
| `await page.keyboard.press(key)`                        | `await pressPageKeyboard(key)`                                                                                                                                         |
| `page.getByRole(role, opts)`                            | `getLocatorByRole(role, opts)`                                                                                                                                         |
| `page.getByText(text)`                                  | `getLocatorByText(text)`                                                                                                                                               |
| `page.getByTestId(id)`                                  | `getLocatorByTestId(id)`                                                                                                                                               |
| `page.getByLabel(text)`                                 | `getLocatorByLabel(text)`                                                                                                                                              |
| `page.getByPlaceholder(text)`                           | `getLocatorByPlaceholder(text)`                                                                                                                                        |
| `page.getByTitle(text)`                                 | `getLocatorByTitle(text)`                                                                                                                                              |
| `page.getByAltText(text)`                               | `getLocatorByAltText(text)`                                                                                                                                            |
| `await expect(loc).toBeVisible()`                       | `await expectElementToBeVisible(input)`                                                                                                                                |
| `await expect(loc).toBeHidden()`                        | `await expectElementToBeHidden(input)`                                                                                                                                 |
| `await expect(loc).toHaveText(t)`                       | `await expectElementToHaveText(input, t)`                                                                                                                              |
| `await expect(loc).toContainText(t)`                    | `await expectElementToContainText(input, t)`                                                                                                                           |
| `await expect(loc).toHaveValue(v)`                      | `await expectElementToHaveValue(input, v)`                                                                                                                             |
| `await expect(loc).toBeChecked()`                       | `await expectElementToBeChecked(input)`                                                                                                                                |
| `await expect(loc).toBeEnabled()`                       | `await expectElementToBeEnabled(input)`                                                                                                                                |
| `await expect(loc).toBeDisabled()`                      | `await expectElementToBeDisabled(input)`                                                                                                                               |
| `await expect(loc).toHaveClass(c)`                      | `await expectElementToHaveClass(input, c)`                                                                                                                             |
| `await expect(loc).toHaveCSS(n, v)`                     | `await expectElementToHaveCSS(input, n, v)`                                                                                                                            |
| `await expect(loc).toHaveId(id)`                        | `await expectElementToHaveId(input, id)`                                                                                                                               |
| `await expect(page).toHaveURL(url)`                     | `await expectPageToHaveURL(url)`                                                                                                                                       |
| `await expect(page).toHaveTitle(t)`                     | `await expectPageToHaveTitle(t)`                                                                                                                                       |
| `await page.locator(sel).innerText()`                   | `await getText(sel)`                                                                                                                                                   |
| `await page.locator(sel).inputValue()`                  | `await getInputValue(sel)`                                                                                                                                             |
| `await page.locator(sel).getAttribute(a)`               | `await getAttribute(sel, a)`                                                                                                                                           |
| `await page.locator(sel).isVisible()`                   | `await isElementVisible(sel)`                                                                                                                                          |
| `await page.locator(sel).isHidden()`                    | `await isElementHidden(sel)`                                                                                                                                           |
| `await page.locator(sel).count()`                       | `await getLocatorCount(sel)`                                                                                                                                           |
| `await request.get(url, opts)`                          | `await getRequest(url, opts)`                                                                                                                                          |
| `await request.post(url, opts)`                         | `await postRequest(url, opts)`                                                                                                                                         |
| `await request.put(url, opts)`                          | `await putRequest(url, opts)`                                                                                                                                          |
| `await request.delete(url, opts)`                       | `await deleteRequest(url, opts)`                                                                                                                                       |
| `await page.locator(sel).scrollIntoViewIfNeeded()`      | `await scrollLocatorIntoView(sel)`                                                                                                                                     |
| `await page.waitForSelector(sel)`                       | `await waitForElementToBeVisible(sel)` (Playwright's default `state` is `visible`; use `waitForElementToBeAttached(sel)` only for an explicit `{ state: 'attached' }`) |
| `await page.locator(sel).isEnabled()`                   | `await isElementEnabled(sel)`                                                                                                                                          |
| `await page.locator(sel).isDisabled()`                  | `await isElementDisabled(sel)`                                                                                                                                         |
| `await page.locator(sel).blur()`                        | `await blur(sel)`                                                                                                                                                      |
| `await page.waitForURL(url)`                            | `await waitForURL(url)`                                                                                                                                                |
| `await page.waitForResponse(u)`                         | `await waitForResponse(u)`                                                                                                                                             |
| `await page.waitForRequest(u)`                          | `await waitForRequest(u)`                                                                                                                                              |
| `await page.waitForFunction(fn)`                        | `await waitForFunction(fn)`                                                                                                                                            |

## Skill Precedence and CLI Discovery

**Precedence (highest → lowest):** project skill → `@anaconda/playwright-utils` → `playwright-cli`

When writing test code, respect this order:

1. **Project skill wins** — if a project-specific skill defines patterns, login flows, or feature-flag helpers, they take priority over library defaults.
2. **`@anaconda/playwright-utils` wins over `playwright-cli`** — every interaction discovered with the CLI must be translated to library equivalents before writing. The CLI-to-Library mapping table above is the contract.
3. **`playwright-cli` is discovery-only** — use it to open pages, take snapshots, run `eval` for selectors, and read console/network output. Never copy its raw output (`page.click()`, `expect(locator)`) into page objects or specs. Translate every interaction before writing, and write the wrapped form directly. Do not stage raw Playwright code to rewrite later. When `playwright-cli` and the library disagree on a pattern, the library wins, always.

### Project Skill Discovery (BLOCKING — do this FIRST, before any other reference)

A repo MAY ship a **project router skill**: a `SKILL.md` under `.claude/skills/`
whose directory name is NOT a distributed common skill
{`anaconda-playwright-utils`, `playwright-cli`, `qa-automation-quality`}. It encodes
this repo's navigation, auth, feature-flag, known-locator, and planning context and
usually exposes an **Intent-routing** table. On conflict it OVERRIDES library/tool
defaults.

Run once, before you explore, survey coverage, plan, write, or diagnose:

1. **Glob** `.claude/skills/*/SKILL.md`.
2. **Identify the project router** = any matched skill whose directory name is NOT
   in the common-skill set above.
   - If `CLAUDE.md` / `AGENTS.md` names a "load first" project skill, that name wins.
   - Exactly one non-common skill → that is the router.
   - Several → pick the one whose `description` / Intent-routing best matches your
     task; load others only if its routing points to them.
   - None → **record "Project skill: none found"** and proceed with common skills only.
3. **Load the project router `SKILL.md` FIRST** and **follow its Intent-routing**:
   pick the row matching your task and load the FIRST reference it names before
   anything else — planning → its planning-context reference; navigation / test runs
   → its repo-structure reference; writing code → `anaconda-playwright-utils`;
   auth → its login-flow reference; feature flags → its feature-flag reference.
4. **Do NOT Glob `tests/`, open a browser, Write, or Edit** until the router is
   loaded (and its first routed reference read) or "none found" is recorded.

Project-agnostic: never hardcodes a router name, derives the project skill by
EXCLUDING the shipped common skills, degrades cleanly to "none found".

## When to Load a Reference

The tables above are sufficient for most test generation — function names, signatures, and the CLI
mapping are all here. Load a `references/*.md` file only when you need exact option types, return
shapes, or worked page-object examples for that module:

- `references/actions.md` — drag/upload/alert flows, or unusual click/fill options (`stable`, `onlyVisible`)
- `references/assertions.md` — choosing hard vs soft assertions; attribute, count, and alert assertions
- `references/locators.md` — 9-tier priority, tile/card link scoping, ancestor/duplicate-test-id patterns, locator field conventions (the planner, generator, and healer each load this before their locator work); pair with `.claude/skills/playwright-cli/references/element-attributes.md` § Step 1–3 (locator discovery)
- `references/element-utils.md` — extracting data, conditional checks, explicit waits
- `references/api-utils.md` — the test makes HTTP requests
- `references/page-utils.md` — multi-tab flows, storage state, manual navigation control
- `references/browser-strategy.md` — before exploring an unfamiliar page (playwright-cli snapshot vs WebFetch)
