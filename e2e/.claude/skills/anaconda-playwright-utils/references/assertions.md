# Assert Utils Reference

Source: `src/playwright-utils/utils/assert-utils.ts`

## Using Assertions in Spec Files

**Do not use assertions in spec files.** Assertions are for building and verifying behaviour inside page objects (e.g. `verify*` methods). Spec files should only orchestrate steps and call those methods so the test reads like a clear, readable scenario.

**Important Guidelines:**

- ✅ All assertions go in page object methods (verify*, check* methods) — spec files read like scenarios, only method calls
- ✅ All test data goes in `tests/testdata/` and is imported
- ✅ Logging and POM rules (`logger`, never `console.log`): SKILL.md § Example Test — Key rules

### Good Example — Readable Spec (No Assertions in Spec)

The spec reads like a test plan; all assertions live in page object classes.

**Spec file** — plain English, no assertion utils:

```typescript
import { test } from '@fixture';

test.describe('Checkout flow @smoke', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.navigateToLoginPage();
    await loginPage.loginWithValidCredentials();
  });

  test('should complete full checkout flow', async ({ productsPage, cartPage, checkoutPage }) => {
    await productsPage.verifyProductsPageIsDisplayed();
    await productsPage.addToCartByProductNumber(1);
    await cartPage.verifyMiniCartCount('1');
    await checkoutPage.goToCart();
    await checkoutPage.fillCheckoutInfo();
    await checkoutPage.clickContinue();
    await checkoutPage.clickFinish();
    await checkoutPage.verifyOrderComplete();
  });
});
```

**Page file** — assertions live here with descriptive messages:

```typescript
// tests/pages/sauce-demo-products-page.ts
import { SMALL_TIMEOUT, expectElementToBeHidden, expectElementToBeVisible } from '@anaconda/playwright-utils';

export class SauceDemoProductsPage {
  private readonly productsContainer = '[data-test="inventory-container"]';

  async verifyProductsPageIsDisplayed(): Promise<void> {
    await expectElementToBeVisible(this.productsContainer, {
      timeout: SMALL_TIMEOUT,
      message: 'Logged in user should see Products',
    });
  }

  async verifyProductsPageIsNotDisplayed(): Promise<void> {
    await expectElementToBeHidden(this.productsContainer, 'Products should not be displayed');
  }
}
```

```typescript
// tests/pages/sauce-demo-checkout-page.ts
import { expectElementToContainText } from '@anaconda/playwright-utils';

export class SauceDemoCheckoutPage {
  private readonly orderCompleteMessage = '[data-test="complete-header"]';

  async verifyOrderComplete(): Promise<void> {
    await expectElementToContainText(this.orderCompleteMessage, /thank you for your order/i, {
      message: 'Checkout complete message should be displayed',
    });
  }
}
```

## Overview

All locator assertions (`expectElement*`):

- Accept `string | Locator` as the `input` parameter
- Support `soft` option for soft assertions that don't stop the test
- Support `timeout` option to override the default expect timeout
- Support `message` option (or a string shorthand) for descriptive failure messages
- Auto-retry until the condition is met or timeout is reached

Exceptions: the page assertions (`expectPage*`) and alert assertions take no `input` locator (alert assertions take the triggering element instead); `expectPageSizeToBeEqualTo` accepts only `{ soft }` and does not retry; `assertAllSoftAssertions(testInfo)` takes the test info object.

## Soft Assertions vs Hard Assertions

### Hard Assertions (Default)

**Use hard assertions for critical checks** — the test fails immediately when the assertion fails.

```typescript
// In the page object class:
async verifyCriticalElement(): Promise<void> {
  await expectElementToBeVisible('.critical-element', 'Critical element must be visible to proceed'); // Hard assertion — fails immediately
}
```

```typescript
// In the spec file:
import { test } from '@fixture';

test('critical flow', async ({ somePage }) => {
  await somePage.verifyCriticalElement();
  // Test stops here if assertion fails
});
```

### Soft Assertions

**Use soft assertions for non-critical checks** — the test continues even if the assertion fails, and fails at the end if any soft assertion failed. Put soft assertions inside page object `verify*` methods, just like hard assertions.

```typescript
// In the page object class:
async verifyOptionalFeatures(): Promise<void> {
  await expectElementToBeVisible('.optional-banner', { soft: true, message: 'Banner should display (non-critical)' });
  await expectElementToHaveText('.secondary-message', 'Info', { soft: true, message: 'Secondary message should say Info' });
  await expectPageToHaveURL(/dashboard/, { message: 'Should be on dashboard' });
}
```

```typescript
// In the spec file — call assertAllSoftAssertions after the page object method:
import { test } from '@fixture';
import { assertAllSoftAssertions } from '@anaconda/playwright-utils';

test.describe('Dashboard optional features @reg', () => {
  test('should display optional features', async ({ dashboardPage }) => {
    await dashboardPage.verifyOptionalFeatures();
    // Fail immediately after all soft checks are done (rather than at test end)
    assertAllSoftAssertions(test.info());
  });
});
```

**When to use each:**

- **Hard assertions** = Critical functionality (login, checkout, core features)
- **Soft assertions** = Nice-to-have features, optional UI elements, analytics tracking

## Element Assertions

| Function                                          | Description                            |
| ------------------------------------------------- | -------------------------------------- |
| `expectElementToBeVisible(input, options?)`       | Element is in DOM and visible          |
| `expectElementToBeHidden(input, options?)`        | Element is not in DOM or hidden        |
| `expectElementToBeAttached(input, options?)`      | Element is in DOM (may not be visible) |
| `expectElementToBeInViewport(input, options?)`    | Element is visible in viewport         |
| `expectElementNotToBeInViewport(input, options?)` | Element is not in viewport             |
| `expectElementToBeChecked(input, options?)`       | Checkbox/radio is checked              |
| `expectElementNotToBeChecked(input, options?)`    | Checkbox/radio is not checked          |
| `expectElementToBeDisabled(input, options?)`      | Element is disabled                    |
| `expectElementToBeEnabled(input, options?)`       | Element is enabled                     |
| `expectElementToBeEditable(input, options?)`      | Element is editable                    |

## Text Assertions

| Function                                               | Description                     |
| ------------------------------------------------------ | ------------------------------- |
| `expectElementToHaveText(input, text, options?)`       | Text equals value (exact match) |
| `expectElementNotToHaveText(input, text, options?)`    | Text does NOT equal value       |
| `expectElementToContainText(input, text, options?)`    | Text contains value (substring) |
| `expectElementNotToContainText(input, text, options?)` | Text does NOT contain value     |

`text` accepts `string | RegExp | Array<string | RegExp>`. Options extend with `ignoreCase?: boolean` and `useInnerText?: boolean`.

## Value Assertions

| Function                                            | Description                         |
| --------------------------------------------------- | ----------------------------------- |
| `expectElementToHaveValue(input, text, options?)`   | Input has the specified value       |
| `expectElementToHaveValues(input, texts, options?)` | Multi-select has specified values   |
| `expectElementValueToBeEmpty(input, options?)`      | Input/editable element is empty     |
| `expectElementValueNotToBeEmpty(input, options?)`   | Input/editable element is not empty |

## Attribute & Count Assertions

| Function                                                        | Description                              |
| --------------------------------------------------------------- | ---------------------------------------- |
| `expectElementToHaveAttribute(input, attr, value, options?)`    | Attribute equals value                   |
| `expectElementToContainAttribute(input, attr, value, options?)` | Attribute contains value                 |
| `expectElementToHaveCount(input, count, options?)`              | Number of matching elements equals count |
| `expectElementToHaveClass(input, expected, options?)`           | Class attribute matches (see note below) |
| `expectElementToHaveCSS(input, name, value, options?)`          | Computed CSS property equals value       |
| `expectElementToHaveId(input, id, options?)`                    | `id` attribute matches                   |

`expectElementToHaveClass` with a **string** matches the entire `class` attribute exactly, not a single class. To assert one class among several, pass a `RegExp` (e.g. `/\bactive\b/`) or an array of strings/RegExps (one entry per class).

`expectElementToContainAttribute` treats a string `value` as a regex source (partial match); pass a `RegExp` for full control, or wrap a literal value with the exported `escapeRegExp` helper if it may contain regex metacharacters. Invalid regex-source strings fail with helper guidance instead of a raw `SyntaxError`.

`escapeRegExp(value)` escapes regex metacharacters so a literal URL or attribute fragment can be passed through `new RegExp(escapeRegExp(value))`.

## Page Assertions

| Function                                         | Description                             |
| ------------------------------------------------ | --------------------------------------- |
| `expectPageToHaveURL(urlOrRegExp, options?)`     | Page URL equals string or matches regex |
| `expectPageToContainURL(urlOrRegExp, options?)`  | Page URL matches a pattern (partial)    |
| `expectPageToHaveTitle(titleOrRegExp, options?)` | Page title matches                      |
| `expectPageSizeToBeEqualTo(count, options?)`     | Number of open pages equals count       |

Use `expectPageToHaveURL` for exact string destinations or an explicit regex pattern. `expectPageToContainURL` treats a string argument as a regex source (partial match) — the same convention `expectElementToContainAttribute` uses for its `value` argument; pass a `RegExp` for full control. Invalid regex-source strings fail with helper guidance instead of a raw `SyntaxError`. For a literal substring that may contain regex metacharacters (`. * + ? ^ $ { } ( ) | [ ] \`), wrap it with the exported `escapeRegExp` helper: `expectPageToContainURL(new RegExp(escapeRegExp(literal)))`.

## Alert Assertions

| Function                                        | Description                                        |
| ----------------------------------------------- | -------------------------------------------------- |
| `expectAlertToHaveText(input, text, options?)`  | Clicks element, asserts alert text equals value    |
| `expectAlertToMatchText(input, text, options?)` | Clicks element, asserts alert text matches pattern |

Alert assertions use the same dialog handling as `acceptAlert`/`getAlertText`: `options.timeout` bounds both the trigger click and dialog wait, trigger click failures surface unchanged, and `No dialog appeared...` is reserved for a successful trigger click that produced no dialog before the timeout.

## Page Object Model Assertion Examples

> Selectors are inlined in some examples below for brevity — real page objects declare every locator as a `private readonly` field (see `references/locators.md` § Locator Declaration: Always Class Fields).

### Dashboard Page with Verification Methods

**Page Object (tests/pages/dashboard-page.ts):**

```typescript
import {
  expectElementToBeVisible,
  expectElementToHaveCount,
  expectElementToHaveText,
  expectPageToHaveTitle,
  expectPageToHaveURL,
  logger,
} from '@anaconda/playwright-utils';

export class DashboardPage {
  async verifyDashboardLoaded() {
    // All assertions in page object, not in spec
    await expectPageToHaveURL(/dashboard/, {
      message: 'User should be on dashboard page',
    });
    await expectPageToHaveTitle('Dashboard', {
      message: 'Page title should be Dashboard',
    });
    await expectElementToBeVisible('.dashboard-header', {
      message: 'Dashboard header should be visible',
    });
  }

  async verifyWelcomeMessage(username: string) {
    await expectElementToHaveText('.welcome-message', `Welcome, ${username}`, {
      message: `Welcome message should greet user as ${username}`,
    });
  }

  async verifyUserListDisplayed() {
    await expectElementToBeVisible('.user-list', {
      message: 'User list should be visible',
    });
    const userCount = 5;
    await expectElementToHaveCount('.user-list-item', userCount, {
      message: `User list should have exactly ${userCount} items`,
    });
  }

  async verifyEmptyState() {
    await expectElementToBeVisible('.empty-state', {
      message: 'Empty state message should be visible',
    });
    await expectElementToHaveText('.empty-message', 'No items found', {
      message: 'Empty state should display correct message',
    });
  }

  async verifyCriticalElements() {
    // Combine multiple assertions for readability
    await expectElementToBeVisible('.header', {
      message: 'Header must be visible for navigation',
    });
    await expectElementToBeVisible('.navigation', {
      message: 'Navigation menu must be visible',
    });
    await expectElementToBeVisible('.content-area', {
      message: 'Main content area must be visible',
    });
  }

  async verifyOptionalFeatures() {
    // Use soft assertions for non-critical checks
    await expectElementToBeVisible('.analytics-widget', {
      soft: true,
      message: 'Analytics widget should display (non-critical)',
    });
    await expectElementToBeVisible('.suggested-items', {
      soft: true,
      message: 'Suggested items should display (non-critical)',
    });
  }
}
```

Fixture registration and spec wiring follow the standard 3-file pattern — see the Example Test in SKILL.md. In specs, call `assertAllSoftAssertions(test.info())` immediately after each page object method that uses soft assertions.

### API Response Verification Page Object

Raw `expect()` on `APIResponse` objects is the API-testing exception to the `expect*` wrappers. The full `UserAPI` page object — GET/POST verification, `toBeOK()` vs status-code assertions, fixture wiring — lives in `references/api-utils.md` § Integration with Page Objects (one canonical copy; do not restate it here).

## Test Data Organization

**Always store test data in `tests/testdata/` folder, not inline in spec files:**

```typescript
// ✓ GOOD: Import from testdata module
export const testUsers = {
  validUser: { name: 'John Doe', email: 'john@example.com' },
  adminUser: { name: 'Admin', email: 'admin@example.com' },
};

import { test } from '@fixture';
import { testUsers } from '@testdata/<module>'; // NOTE: replace <module> with your project testdata module (under tests/testdata/)

// ✓ GOOD: Page object method returns data; spec only orchestrates, no raw assertions
test.describe('User API @smoke', () => {
  test('verify user created', async ({ userAPI }) => {
    await userAPI.verifyUserCreated(testUsers.validUser);
  });
});

// ✗ WRONG: Inline test data
test.describe('User API @smoke', () => {
  test('verify user created', async ({ userAPI }) => {
    await userAPI.verifyUserCreated({
      name: 'John Doe',
      email: 'john@example.com',
    });
  });
});
```

This keeps specs clean, reuses data across tests, and separates concerns.

## Key POM Assertion Rules

✓ **Do:** Put all assertions in page object methods
✓ **Do:** Use descriptive method names like `verifyDashboardLoaded()`
✓ **Do:** Combine related assertions into single methods for readability
✓ **Do:** Add descriptive error messages to assertions
✓ **Do:** Return data from verification methods if needed by tests
✓ **Do:** Store test data in `tests/testdata/` and import it

✗ **Don't:** Put assertions directly in spec files
✗ **Don't:** Repeat assertion patterns across multiple tests
✗ **Don't:** Mix assertions with actions without clear method names
✗ **Don't:** Use inline test data (use testdata folder instead)

## Option Types

```typescript
type ExpectOptions = TimeoutOption & SoftOption & MessageOrOptions;
// TimeoutOption = { timeout?: number }
// SoftOption = { soft?: boolean }
// MessageOrOptions = string | { message?: string }

type ExpectTextOptions = { ignoreCase?: boolean; useInnerText?: boolean };
```
