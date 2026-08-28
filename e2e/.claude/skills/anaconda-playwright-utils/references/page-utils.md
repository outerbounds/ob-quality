# Page Utils Reference

Source: `src/playwright-utils/utils/page-utils.ts`

## Overview

Page utils provide functions for page management, navigation, and multi-tab handling. All functions work with the library's singleton page pattern — they internally call `getPage()` to access the current page instance, so you don't need to pass `page` to every function call.

## Page Instance Management

### `getPage(): Page`

Returns the current `Page` instance (singleton). This is called internally by all utility functions.

**Usage:**

```typescript
const page = getPage();
// Use only for advanced Playwright API access when utility functions don't cover your use case
```

### `setPage(pageInstance: Page): void`

Sets the current `Page` instance. **Automatically called by the fixture before each test — you don't need to use this directly.**

**Always use the fixture pattern:**

**Page file** — setPage() already called by fixture, so page object methods can call utilities directly:

```typescript
// tests/pages/home-page.ts
import { click, expectPageToHaveURL, gotoURL } from '@anaconda/playwright-utils';
import { urlData } from '@testdata/<module>'; // imports url data

export class HomePage {
  async navigateToHomePage(): Promise<void> {
    await gotoURL(urlData.homePageUrl);
  }

  async clickPrimaryButton(): Promise<void> {
    await click('#button');
  }

  async verifyRemainsOnExampleDomain(): Promise<void> {
    await expectPageToHaveURL(/example/, { message: 'Should remain on the example domain after clicking button' });
  }
}
```

**Spec file** — no direct utility calls, only page object methods:

```typescript
import { test } from '@fixture'; // Automatically calls setPage(page) before each test

test('example', async ({ homePage }) => {
  await homePage.navigateToHomePage();
  await homePage.clickPrimaryButton();
  await homePage.verifyRemainsOnExampleDomain();
});
```

**Do NOT manually call `setPage()`** — The fixture handles page setup automatically for all tests.

### `getContext(): BrowserContext`

Returns the browser context associated with the current page.

**Usage:**

```typescript
const context = getContext();
const cookies = await context.cookies();
const pages = context.pages(); // synchronous — returns Page[]
```

### Singleton Pattern Explanation

The library maintains a module-level `page` variable. This design eliminates the need to pass `page` to every function. The fixture handles page setup automatically:

**Standard Playwright (pass page to every function):**

```typescript
await page.goto(url);
await page.locator(sel).click();
await expect(page.locator(sel), 'Element should be visible after action').toBeVisible();
```

**With anaconda-playwright-utils + fixture (no setPage needed):**

```typescript
// Fixture calls setPage(page) automatically
await gotoURL(url);
await click(sel);
await expectElementToBeVisible(sel, 'Element should be visible after action');
```

This makes test code cleaner, easier to read, and eliminates the need for manual page setup.

## Multi-Tab Management

### `getAllPages(): Page[]`

Returns an array of all pages (tabs) in the current browser context.

**Example:**

```typescript
import { getAllPages, logger } from '@anaconda/playwright-utils';

const pages = getAllPages();
logger.info(`Total tabs open: ${pages.length}`); // log only for multi-tab debug — remove in production
```

### `switchPage(winNum: number, options?): Promise<void>`

Switches to a different page (tab) by its **1-based index** and makes it the current page.

**Parameters:**

- `winNum` — 1-based index (1 = first tab, 2 = second tab, etc.)
- `options.loadState` — Load state to wait for after switching (default: `'load'`)
- `options.timeout` — How long to wait for the tab to appear, retrying until it exists (default: `SMALL_TIMEOUT`, 5000ms)

**Important:** Always use 1-based indexing, not 0-based.

**Example:**

```typescript
// User action opens a new tab (second tab created)
await click('a[target="_blank"]');

// Switch to the new tab (index 2)
await switchPage(2);

// Now all utility functions work on the new tab
await expectPageToHaveURL(/new-page/, { message: 'Should have navigated to new page in second tab' });
await click('#content-button');

// Switch back to the first tab
await switchPage(1);
```

### `switchToDefaultPage(): Promise<void>`

Switches back to the first page (index 1) and brings it to the front. Unlike `switchPage(1)`, it does not retry while waiting for the tab to appear and does not wait for a load state.

**Example:**

```typescript
// After working on multiple tabs, return to the original
await switchToDefaultPage();
```

### `closePage(winNum?: number): Promise<void>`

Closes a page (tab) by its 1-based index. If no index is provided, closes the current page.

**Parameters:**

- `winNum` — Optional 1-based index. If omitted, closes the current page.

**Example:**

```typescript
// Close the second tab
await closePage(2);

// Close the current tab
await closePage();
```

**Important:** After closing a page, the library automatically switches to the default page (index 1) if there are remaining pages. Call `switchPage()` explicitly only if you need to land on a specific tab.

## Navigation Functions

### `gotoURL(path: string, options?): Promise<Response | null>`

Navigates to the specified URL. Waits for the default load state before returning.

**Parameters:**

- `path` — URL or path to navigate to
- `options.timeout` — Navigation timeout (default: your config's `navigationTimeout` — `NAVIGATION_TIMEOUT` (30s) when spreading `AnacondaConfigDefaults`)
- `options.waitUntil` — Load state to wait for: `'load'` | `'domcontentloaded'` | `'networkidle'` | `'commit'`
- `options.referer` — Referer header value

**Example:**

```typescript
await gotoURL(urlData.exampleUrl);
await gotoURL(urlData.exampleUrl, { waitUntil: 'networkidle' });
await gotoURL('/relative/path'); // Relative to base URL
```

### `getURL(options?): Promise<string>`

Returns the current page URL. Optionally waits for a load state first.

**Example:**

```typescript
const currentURL = await getURL();

// Wait for network idle before getting URL (useful after navigation)
const finalURL = await getURL({ waitUntil: 'networkidle' });
```

### `waitForPageLoadState(options?): Promise<void>`

Waits for a specific page load state.

**Parameters:**

- `options.waitUntil` — Load state to wait for (default: from constants; `'commit'` is ignored — the default is used instead)

**Example:**

```typescript
// Wait for all network requests to complete
await waitForPageLoadState({ waitUntil: 'networkidle' });

// Wait for DOM to be interactive
await waitForPageLoadState({ waitUntil: 'domcontentloaded' });
```

### `reloadPage(options?): Promise<void>`

Reloads the current page.

**Example:**

```typescript
await reloadPage();
await reloadPage({ waitUntil: 'domcontentloaded' });
```

### `goBack(options?): Promise<void>`

Navigates to the previous page in browser history.

**Example:**

```typescript
// Use goBack() directly for browser history navigation:
await goBack();
```

## Network and Function Waits

### `waitForURL(url, options?): Promise<void>`

Waits for the page to navigate to a URL matching a string, glob, RegExp, or predicate. Use for SPA
client-side route changes and redirect chains that `waitForPageLoadState` cannot detect.

**Example:**

```typescript
await click('#login-button');
await waitForURL('**/dashboard');
```

### `waitForResponse(urlOrPredicate, options?): Promise<Response>`

Waits for a network response matching a URL/glob/RegExp/predicate. Start the wait before the action
that triggers the request, then await both together.

**Example:**

```typescript
const [response] = await Promise.all([waitForResponse('**/api/users'), click('#load-users')]);
expect(response.status(), 'Users API response should be OK').toBe(200);
```

### `waitForRequest(urlOrPredicate, options?): Promise<Request>`

Waits for a network request matching a URL/glob/RegExp/predicate — useful to assert an action fired
a specific API call.

**Example:**

```typescript
const [request] = await Promise.all([waitForRequest('**/api/track'), click('#cta-button')]);
```

### `waitForFunction(pageFunction, arg?, options?): Promise<JSHandle>`

Waits until an in-page JavaScript condition becomes truthy — for conditions the DOM-state waits
cannot express.

**Example:**

```typescript
await waitForFunction(() => window.__appReady === true);
```

## Utility Functions

### `wait(ms: number): Promise<void>`

Waits for a specified number of milliseconds. Use sparingly — prefer explicit waits for specific conditions.

**Example:**

```typescript
await wait(1000); // Wait 1 second
```

**Better alternatives:**

```typescript
// Instead of arbitrary wait(), use explicit waits
await waitForElementToBeVisible('.modal'); // Wait for visibility
await waitForPageLoadState(); // Wait for page load
await expectElementToBeVisible('.content', 'Content should be visible after page load'); // Assert with auto-retry
```

### `getWindowSize(): Promise<{ width: number; height: number }>`

Returns the current browser window size in pixels.

**Example:**

```typescript
const { width, height } = await getWindowSize();

if (width < 768) {
  // Handle mobile viewport
}
```

### `saveStorageState(path?: string): Promise<StorageState>`

Saves the current browser storage state (cookies, localStorage, sessionStorage) to a file. Returns the storage state object.

**Parameters:**

- `path` — Optional file path. If provided, saves to file. If omitted, returns state without saving.

**Returns:** Storage state object with structure:

```typescript
{
  cookies: Array<{ name, value, domain, path, ... }>,
  origins: Array<{ origin, localStorage: Array<{ name, value }>, ... }>
}
```

**Example:**

```typescript
import { logger, saveStorageState } from '@anaconda/playwright-utils';

// Save to file
await saveStorageState('./auth-state.json');

// Get state without saving
const state = await saveStorageState();
logger.info(`Cookies captured: ${state.cookies?.length ?? 0}`); // log only during auth setup
```

**Usage with authentication:** the full auth-capture pattern (setup spec in `tests/storage-setup/`, `playwright.config.ts` wiring with `dependencies: ['setup']`, consuming spec) is in § Save and Restore Authentication below — one canonical copy.

## Multi-Tab Workflow Example (Page Object Model)

> Selectors are inlined in some examples below for brevity — real page objects declare every locator as a `private readonly` field (see `references/locators.md` § Locator Declaration: Always Class Fields).

**Page Object (tests/pages/dashboard-page.ts):**

```typescript
import {
  click,
  closePage,
  expectElementToBeVisible,
  expectPageToHaveURL,
  fill,
  getText,
  gotoURL,
  switchPage,
  switchToDefaultPage,
} from '@anaconda/playwright-utils';
import { urlData } from '@testdata/<module>';

export class DashboardPage {
  async navigateToDashboard() {
    await gotoURL(urlData.homePageUrl);
  }

  async verifyDashboardLoaded() {
    await expectElementToBeVisible('.dashboard', {
      message: 'Dashboard should be visible after navigation',
    });
  }

  async openProductInNewTab() {
    await click('a[target="_blank"]');
    await switchPage(2); // Switch to new tab
  }

  async verifyProductPageLoaded() {
    await expectPageToHaveURL(/product-2/, {
      message: 'Product page should be loaded when switching to tab 2',
    });
    await expectElementToBeVisible('.product-page', {
      message: 'Product page content should be visible',
    });
  }

  async getProductDetails() {
    const itemId = await getText('.item-id');
    const price = await getText('.price');
    return { itemId, price };
  }

  async submitProductReview(comment: string) {
    await fill('#comment', comment);
    await click('#submit-button');
  }

  async verifyReviewSubmitted() {
    await expectElementToBeVisible('.success-message', {
      message: 'Success message should appear after submitting review',
    });
  }

  async closeProductTab() {
    await closePage(2);
  }

  async returnToDashboard() {
    await switchToDefaultPage();
  }

  async verifyDashboardReturned() {
    await expectPageToHaveURL('https://example.com', {
      message: 'Should return to dashboard (tab 1) with correct URL',
    });
    await expectElementToBeVisible('.dashboard', {
      message: 'Dashboard should be visible when returning to tab 1',
    });
  }
}
```

Fixture registration follows the standard 3-file pattern — see the Example Test in SKILL.md. The spec alternates action and verify calls:

```typescript
import { test } from '@fixture';
import { reviewData } from '@testdata/<module>';

test('should review a product in a second tab', async ({ dashboardPage }) => {
  await dashboardPage.navigateToDashboard();
  await dashboardPage.verifyDashboardLoaded();
  await dashboardPage.openProductInNewTab();
  await dashboardPage.verifyProductPageLoaded();
  await dashboardPage.submitProductReview(reviewData.review);
  await dashboardPage.verifyReviewSubmitted();
  await dashboardPage.closeProductTab();
  await dashboardPage.returnToDashboard();
  await dashboardPage.verifyDashboardReturned();
});
```

## Option Types

```typescript
type GotoOptions = {
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  referer?: string;
};

type NavigationOptions = {
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
};

type SwitchPageOptions = {
  loadState?: WaitForLoadStateOptions; // Default: 'load'
  timeout?: number; // How long to wait for the tab to appear (default: SMALL_TIMEOUT, 5000ms)
};
```

## Common Patterns

### Navigation vs Same-Page Interactions

Never call `waitForPageLoadState` after `clickAndNavigate()` — it already waits internally. The click vs `clickAndNavigate` decision rule and worked ❌/✅ examples live in `references/actions.md` § Click Actions (canonical copy). After `click()`, use element-level waits (`waitForElementToBeVisible` / `waitForElementToBeHidden`) only when dynamic content needs them (see element-utils.md).

### Handle Multiple Tabs in Workflow

```typescript
export class ComparisonPage {
  async openSecondProductTab() {
    await gotoURL(urlData.productPageUrl);
    await click('a[target="_blank"]');
    await switchPage(2);
  }

  async verifySecondProductPageLoaded() {
    await expectPageToHaveURL(/product-2/, {
      message: 'Second product page should load in tab 2',
    });
  }

  async getPrices() {
    // Tab 2 is current — read its price, then read tab 1's
    const price2 = await getText('.price');
    await switchToDefaultPage();
    const price1 = await getText('.price');
    return { price1, price2, isCheaper: parseInt(price1) < parseInt(price2) };
  }

  async closeSecondTab() {
    await closePage(2); // closePage switches back to tab 1 automatically
  }
}
```

The spec calls action, verify, and data methods in sequence:

```typescript
await comparisonPage.openSecondProductTab();
await comparisonPage.verifySecondProductPageLoaded();
const { price1, price2, isCheaper } = await comparisonPage.getPrices();
await comparisonPage.closeSecondTab();
```

### Save and Restore Authentication

Auth setup is done in a dedicated setup spec that runs once. All other tests then consume the saved state via `playwright.config.ts`.

```typescript
// tests/storage-setup/auth.setup.ts — runs once to capture auth state
import { test } from '@fixture'; // fixture auto-calls setPage(page)
import { clickAndNavigate, fill, gotoURL, saveStorageState } from '@anaconda/playwright-utils';
import { urlData } from '@testdata/<module>';
import { userData } from '@testdata/<module>';

test('authenticate and save state', async () => {
  await gotoURL(urlData.loginPageUrl);
  await fill('#username', userData.userName);
  await fill('#password', userData.pwd);
  await clickAndNavigate('#login-button');
  await saveStorageState('./.auth/user-auth.json');
});
```

```typescript
// playwright.config.ts — apply saved state to all authenticated tests
{
  name: 'authenticated',
  use: { storageState: './.auth/user-auth.json' },
  dependencies: ['setup'],
}
```

```typescript
// spec excerpt — already authenticated, no login needed
import { test } from '@fixture';

test.describe('Protected pages @smoke', () => {
  test('should access protected content', async ({ protectedPage }) => {
    await protectedPage.verifyProtectedContentIsDisplayed();
  });
});
```
