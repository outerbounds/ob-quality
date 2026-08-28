# Locator Utils Reference

Source: `src/playwright-utils/utils/locator-utils.ts`

## Locator Strategy Priority

When choosing locators for test code, follow this priority order (best to worst). **Prefer unique CSS or XPath with stable attributes over text-based locators** so that when a check fails you can tell quickly whether the element is missing (bug) or the copy changed (new functionality / locale).

> **Mandatory upgrade rule:** If a DOM snapshot or page inspection reveals a `data-qa-id` or any `data-*` attribute on an element, use it. Never keep a role- or text-based locator when a stable attribute exists — even if the CLI generated one. **Accessibility snapshots often omit `data-qa-id`** — run the **core eval** in `.claude/skills/playwright-cli/references/element-attributes.md` § Step 1, apply § Step 2 rules, then **verify** with § Step 3.

### 1. `data-qa-id` attributes (Best)

Purpose-built for testing by QA and developers. Never changes due to styling or refactoring. Anaconda projects configure `use.testIdAttribute = 'data-qa-id'` in `playwright.config.ts` — `getLocatorByTestId()` only resolves the configured attribute, so this setting is required for `data-qa-id` to work.

```typescript
// HTML: <button data-qa-id="submit-order">Place Order</button>
await click(getLocatorByTestId('submit-order'));

// HTML: <input data-qa-id="email-input">
await fill(getLocatorByTestId('email-input'), userData.email);
```

### 2. Other `data-*` attributes

Anaconda projects use `data-qa-id` as the configured `testIdAttribute` (tier 1). Any other `data-*` attribute — including `data-testid`, `data-test`, `data-product-id` — is not the configured testId and must use a CSS selector. `data-testid` is Playwright's default `testIdAttribute` out of the box, but Anaconda projects override this with `data-qa-id`.

```typescript
// HTML: <button data-testid="submit-order">Place Order</button>
await click('[data-testid="submit-order"]'); // ✅ CSS for data-testid (not Anaconda's configured testIdAttribute)

// HTML: <div data-product-id="shoes-001">...</div>
await click('[data-product-id="shoes-001"]'); // ✅ CSS for non-testId data-* attributes

// HTML: <h2 data-test="complete-header">Thank you for your order</h2>
const orderCompleteMessage = () => getLocator('[data-test="complete-header"]');
await expectElementToContainText(orderCompleteMessage(), /thank you for your order/i, {
  message: 'Checkout complete message should be displayed',
});
```

### 3. `id` attributes

Stable when IDs are meaningful and developer-controlled. Avoid auto-generated IDs.

```typescript
// Good: semantic ID
await fill('#search-input', 'playwright');

// Bad: auto-generated ID (changes every render)
// await fill('#input-7f3a2b', 'playwright');  // DON'T use this
```

### 4. `name` attributes

Reliable for form elements. Often stable across releases.

```typescript
// HTML: <input name="email" type="email">
await fill('[name="email"]', userData.email);

// HTML: <select name="country">...</select>
await selectByText('[name="country"]', 'United States');
```

### 5. XPath with unique attributes

Use when no `data-*` or id attribute is available. Target **stable attributes** (e.g. `data-test`, `aria-*`, `type`), not text.

```typescript
// Good: XPath with stable attributes
await click('//button[@aria-label="Close dialog"]');
await click('//input[@type="email"]');

// Good: ancestor scoping with stable attributes
await click('//div[@data-section="billing"]//button[@type="submit"]');
```

### 6. CSS with unique attributes

Use stable attribute selectors so the locator does not depend on copy or locale.

```typescript
// Good: attribute-based CSS
await click('button[aria-label="Close dialog"]');
await fill('input[type="email"]', userData.email);

// Good: scoped by stable parent
await click('.billing-section button[type="submit"]');

// Good: data-test (e.g. Sauce Demo checkout complete)
const orderCompleteMessage = () => getLocator('[data-test="complete-header"]');
await expectElementToContainText(orderCompleteMessage(), /thank you for your order/i, {
  message: 'Checkout complete message should be displayed',
});
```

### 7. Playwright built-in locators (role / text) — use only when no stable selector exists

Text- and role-based locators are **flaky**: they change with copy, locale, and country. If the only way to find an element is by its text, a failure does not tell you whether the element is missing (bug) or the wording changed (new feature / i18n). Prefer `data-qa-id`, `data-testid`, `data-*`, `id`, or **unique CSS/XPath** first.

When you must use role or text:

```typescript
// By ARIA role + accessible name
await click(getLocatorByRole('button', { name: 'Submit' }));
await fill(getLocatorByRole('textbox', { name: 'Email' }), userData.email);

// By label text (form fields)
await fill(getLocatorByLabel('Email address'), userData.email);

// By placeholder text
await fill(getLocatorByPlaceholder('Search...'), searchData.query);

// By visible text — avoid for assertions; use stable selector + assert text separately
await click(getLocatorByText('Add to cart'));

// By title attribute
await hover(getLocatorByTitle('Close'));

// By alt text (images)
await expectElementToBeVisible(getLocatorByAltText('Company logo'), 'Logo should be visible');
```

**Assertions:** Prefer a **stable locator** for the element and assert the **text in the assertion**. That way a failure shows "expected text X, got Y" (copy change) vs element not found (bug).

```typescript
// Prefer: stable selector + text in assertion
const orderCompleteMessage = () => getLocator('[data-test="complete-header"]');
await expectElementToContainText(orderCompleteMessage(), /thank you for your order/i, {
  message: 'Checkout complete message should be displayed',
});

// Avoid: locating by text — fails ambiguously if copy or locale changes
// const orderCompleteMessage = () => getLocatorByRole('heading', { name: /thank you for your order/i });
```

### 8. XPath (structural)

Positional XPath. Fragile — use as last resort.

```typescript
// Fragile: depends on DOM structure
await click('//div[@class="form-group"][2]//button');
```

### 9. CSS (structural)

Positional CSS. Equally fragile.

```typescript
// Fragile: depends on DOM order
await click('.form-group:nth-child(2) button');
```

### What to Avoid

Locators that rely on values likely to change between runs:

```typescript
// DON'T: auto-generated IDs
await click('#ember-1234');
await click('#react-select-3-option-0');

// DON'T: dynamic index numbers or counts
await click('//tr[42]/td[3]/button');

// DON'T: timestamp or session-dependent values
await click('[data-id="item-1710612345"]');

// DON'T: deeply nested structural paths
await click('div > div > div > ul > li:nth-child(3) > a');

// DON'T: class names from CSS frameworks (change on rebuild)
await click('.css-1a2b3c');
await click('.MuiButton-root-123');
```

## Locator Declaration: Always Class Fields

Every locator referenced inside a page-object action or `verify*` method **must point to a `private readonly` field**. Static selectors may be string fields, computed locators may be arrow-function fields, and parameterized locators must be parameterized `private readonly` arrow-function fields. Constructing a locator inline inside a method body — `const x = getLocator(...)`, or passing `getLocatorByTestId('foo')` straight to an assertion — is **not allowed**. The page object is the single source of truth for selectors; inline construction hides the locator from search, prevents reuse across methods, and is the most common cause of the same element having three slightly different selectors scattered across a suite.

This applies to **every locator helper exported by `@anaconda/playwright-utils`** (`getLocator`, `getVisibleLocator`, `getLocatorByTestId`, `getLocatorByRole`, `getLocatorByText`, `getLocatorByLabel`, `getLocatorByPlaceholder`, plus the frame helpers `getFrameLocator` and `getLocatorInFrame`), to **template-literal-composed** selectors (`` `${this.parent} thead th` ``), and to **dynamic / parameterized** locators (which become parameterized `private readonly` arrow-function fields, not inline constructions).

The invariant is bi-directional: **declare only locators you use** — every `private readonly` locator field must be referenced by at least one method in the same page object. Do not declare speculative fields for elements you merely discovered, and delete leftover fields when the method that used them is removed or rewritten.

```typescript
// ❌ Wrong — inline construction inside a method
async verifyTableHasHeaders(): Promise<void> {
  const tableHeaders = getLocator(`${this.storageTable} thead th`);
  await expectElementToBeVisible(tableHeaders, 'Table headers should be visible');
}

// ❌ Wrong — inline factory call passed straight into an assertion
async verifySuccessHeader(): Promise<void> {
  await expectElementToBeVisible(getLocatorByTestId('success-header'), 'Success header should be visible');
}
```

```typescript
// ✅ Right — static + arrow-function fields; methods reference them via this.x()
export class StoragePage {
  private readonly storageTable = '[data-qa-id="storage-table"]';
  private readonly storageTableHeaders = () => getLocator(`${this.storageTable} thead th`);
  private readonly successHeader = () => getLocatorByTestId('success-header');

  async verifyTableHasHeaders(): Promise<void> {
    await expectElementToBeVisible(this.storageTableHeaders(), 'Table headers should be visible');
  }
  async verifySuccessHeader(): Promise<void> {
    await expectElementToBeVisible(this.successHeader(), 'Success header should be visible');
  }

  // ✅ Right — dynamic locator: declare as a parameterized arrow-function field, not constructed inline
  private readonly storageRowByName = (name: string) =>
    getLocator(`${this.storageTable} tbody tr[data-qa-id="row-${name}"]`);

  async deleteFile(name: string): Promise<void> {
    await click(this.storageRowByName(name).locator('button[aria-label="Delete"]'));
  }
}
```

The only locator references allowed inside a method body are `this.<fieldName>` (static string), `this.<fieldName>()` (arrow-function field), or `this.<fieldName>(args)` (parameterized arrow-function field). You may chain locator methods off those page-object-owned locators when narrowing scope, such as `this.storageRowByName(name).locator(...)`; do not call `getLocator*()` inline. If you find yourself typing `getLocator*(` inside an `async` or `verify*` method body, lift it to a class field first.

## Key Concept: Visible by Default

`getVisibleLocator()` (and by extension the standard action functions — click, fill, check, hover, etc.) filters to only visible elements by default. This prevents accidentally interacting with hidden duplicates. The JS-bypass, scroll, and alert helpers are exempt — exact list in SKILL.md § Core Pattern.

```typescript
// Returns locator filtered to visible elements
const loc = getVisibleLocator('#submit');

// Equivalent to:
const loc = getLocator('#submit', { onlyVisible: true });

// To include hidden elements:
const loc = getLocator('#submit', { onlyVisible: false });
```

## When Multiple Elements Match

**During exploration (planner/generator):** Run the **core eval** (`element-attributes.md` § Step 1) — `dupCount` is included in the JSON. When `dupCount > 1`, scope before writing the plan or page object; run **containment eval** only when proposing an ancestor (§ Duplicate test-id scoping). **Verify** every composed selector with Step 3 (`document.querySelectorAll('<selector>').length` → must be 1).

Standard action functions enforce `onlyVisible: true` internally, so hidden duplicates are typically filtered at call time (the JS-bypass, scroll, and alert helpers are the exceptions). If multiple elements **still** match after that, the fix is a **more specific locator** — not a visibility wrapper and not an index.

**Step 1 — look for a unique attribute on the target or a stable ancestor, then scope:**

```typescript
// ❌ Never — index breaks silently when the page changes
private readonly pendingButton = () => getLocatorByText('Pending').nth(2);
```

```typescript
// ✅ One ancestor — prefer getLocatorByTestId chaining
private readonly channelItem = () =>
  getLocatorByTestId('channel-list').locator('[data-qa-id="channel-item"]');

// ✅ Two or more ancestors, or mixed locator types — CSS compound is preferred
private readonly pendingButton = '[data-qa-id="dashboard"] [data-qa-id="channel-list"] [data-qa-id="pending-btn"]';

// ✅ XPath ancestor scope (stable attribute on row + aria-label on button)
private readonly latestRowPendingButton = '//tr[@data-qa-id="latest-row"]//button[@aria-label="Pending"]';
```

**When to use CSS compound vs `getLocatorByTestId` chaining:**

- **Single element** — always `getLocatorByTestId()`: `private readonly x = () => getLocatorByTestId('x')`
- **One ancestor** — `getLocatorByTestId` chaining is preferred: `getLocatorByTestId('parent').locator('[data-qa-id="child"]')`
- **Two or more ancestors, or mixed types** — CSS compound is preferred over deeply nested chains:

```typescript
// ❌ Over-engineered — hard to read
private readonly pendingButton = () =>
  getLocatorByTestId('dashboard')
    .locator(getLocatorByTestId('channel-list').locator('[data-qa-id="pending-btn"]'));
```

```typescript
// ✅ CSS compound — flat, readable, and maintainable
private readonly pendingButton = '[data-qa-id="dashboard"] [data-qa-id="channel-list"] [data-qa-id="pending-btn"]';
```

**Step 2 — if no stable attribute exists on the target, write a custom XPath using structural context + stable ancestor attributes:**

```typescript
// ✅ XPath scoped by nearest ancestor with a stable attribute
private readonly submitButton = '//div[@id="billing-section"]//button[@type="submit"]';
```

**`.nth()` / `.first()` / `.last()` are last resort only.** If you must use one, add a comment explaining why no unique locator was possible — it is a signal to revisit when the element gains a stable attribute.

## Tile and card navigation links (document-wide anti-pattern)

When `dupCount > 1` or the locator must identify a **specific UI instance**, apply **anchor priority** in `.claude/agents/references/planner-anti-patterns.md` § Duplicate test-id detection — same scoped locator for visibility and actions. Use the patterns below whenever an `href` or accessible-name match alone cannot prove that the right element rendered.

Navigation tests for **linked UI components** must locate the **specific instance**, not merely “any link with this URL” or “any link with this name.” Document-wide locators identify a destination or label, not the component — another nav link, footer duplicate, breadcrumb, or CTA can satisfy the locator and produce **false positives**.

### Do not use document-wide href, role, or text alone

```typescript
// ❌ Document-wide — matches any <a> with this path anywhere on the page
private readonly categoryACard = 'a[href="/categories/category-a"]';

// ❌ Document-wide — matches any link whose accessible name matches, anywhere on the page
private readonly categoryACardByRole = () =>
  getLocatorByRole('link', { name: /Category A logo Category A/i });
```

Before writing any tile/card click locator, the core eval (`.claude/skills/playwright-cli/references/element-attributes.md` § Step 1) returns `href` and `testId` — use them with tile/card rules in Step 2. **Never** use document-wide `a[href="…"]`, `getLocatorByRole('link', …)`, or `getLocatorByText` for tile/card/package navigation, even when only one match exists today.

Verify region-scoped or `:has()` compounds with Step 3:

```bash
playwright-cli eval "document.querySelectorAll('<your-compound-selector>').length"
# => 1  → proceed
```

### Preferred patterns (best → acceptable fallback)

**1. Tier-1 CSS compound — tile title test id + link wrapper (best when `data-qa-id` exists on the card title)**

Use when the tile has a `data-qa-id` on an inner element (e.g. `<h3>`) and the click target is a wrapping `<a>`:

```typescript
// ✅ tier 1 + structural — targets the category tile link, not footer or nav duplicates
private readonly categoryACard =
  '.card-grid a.card-link:has([data-qa-id="category-a"])';

// ✅ tier 1 — when Step 3 count = 1 without a known link-wrapper class; common for channel/package cards
private readonly channelACard = 'a:has([data-qa-id="channel-a"])';
```

When the same test id is duplicated elsewhere (e.g. footer link with id on the `<a>` itself, tile with id on inner `<h3>`), `:has()` on the link wrapper disambiguates — `:has()` matches descendants, not the element's own attribute, so `<a><h3 data-qa-id="channel-a">` matches while `<a data-qa-id="channel-a">` in the footer typically does not.

**2. Region-scoped href — when no tier-1 id exists on the tile**

Scope `href` to the **feature container**, never document-wide:

```typescript
// ✅ acceptable fallback — href tier 6, scoped to the card grid region
private readonly categoryCCard = '.card-grid a[href="/categories/category-c"]';
```

**3. Test-id ancestor chaining — when a unique parent test id wraps the tile**

```typescript
// ✅ when channel-list is a verified true container (containment check passes)
private readonly channelItem = () =>
  getLocatorByTestId('channel-list').locator('[data-qa-id="channel-item"]');
```

### Decision table

| Situation                                                                 | Locator                                                                                                                                                                                |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tile has `data-qa-id` on title/label inside link wrapper                  | `{region} a:has([data-qa-id="…"])` or `{region} a.{link-wrapper}:has([data-qa-id="…"])` (CSS compound, tier 1)                                                                         |
| Duplicate test id elsewhere on page (title in tile + catalog/footer link) | `:has()` link compound for tile click; landmark/region scope for catalog duplicate — never bare `getLocatorByTestId`, bare `href`, or bare `getLocatorByRole('link', …)` document-wide |
| No test id on tile; known feature region                                  | `{region} a[href="…"]` — region class or verified container                                                                                                                            |
| Footer / catalog link with unique test id on `<a>`                        | `getLocatorByTestId('…')` when count = 1, or scoped landmark when duplicated                                                                                                           |

Record the chosen pattern in plan `**Locator scope:**`. Planner, generator, and healer use the same rules — see `.claude/agents/references/planner-anti-patterns.md` § Duplicate test-id detection (anchor priority).

## Locator Functions

### `getLocator(input: string | Locator, options?: LocatorOptions): Locator`

Core function. If `input` is a string, creates a locator via `page.locator(input)`. If `input` is already a Locator, returns it as-is. When `onlyVisible: true`, appends `visible=true` filter.

### `getVisibleLocator(input: string | Locator, options?: LocatorOptions): Locator`

Same as `getLocator` but defaults to `onlyVisible: true`. This is what action functions use internally.

### `getLocatorByTestId(testId: string | RegExp, options?: VisibilityOption): Locator`

Uses `page.getByTestId()`. The attribute is `use.testIdAttribute` in `playwright.config.ts`. **Anaconda projects:** `'data-qa-id'` via `AnacondaProjectDefaults` (Playwright's stock default without this library is `'data-testid'`). Pass the attribute **value** only (e.g. `'submit-order'`), not a CSS selector. Pass `{ onlyVisible: true }` to restrict matches to visible elements.

### `getLocatorByText(text: string | RegExp, options?: GetByTextOptions): Locator`

Uses `page.getByText()`. Finds elements by their text content.

### `getLocatorByRole(role: GetByRoleTypes, options?: GetByRoleOptions): Locator`

Uses `page.getByRole()`. Finds elements by ARIA role.

```typescript
const btn = getLocatorByRole('button', { name: 'Submit' });
const link = getLocatorByRole('link', { name: /learn more/i });
```

### `getLocatorByLabel(text: string | RegExp, options?: GetByLabelOptions): Locator`

Uses `page.getByLabel()`. Finds form elements by their associated label.

### `getLocatorByPlaceholder(text: string | RegExp, options?: GetByPlaceholderOptions): Locator`

Uses `page.getByPlaceholder()`. Finds input elements by placeholder text.

### `getLocatorByTitle(text: string | RegExp, options?: GetByTitleOptions): Locator`

Uses `page.getByTitle()`. Finds elements by their `title` attribute.

### `getLocatorByAltText(text: string | RegExp, options?: GetByAltTextOptions): Locator`

Uses `page.getByAltText()`. Finds elements (e.g. images) by their `alt` text.

### `getAllLocators(input: string | Locator, options?): Promise<Locator[]>`

Returns all matching locators as an array. Waits for at least the first element to be attached before resolving.

Options include `waitForLocator?: boolean` (default `true`), `timeout?: number`, and `onlyVisible?: boolean` (filters out hidden matches, same as `getLocator`).

## Frame Functions

### `getFrame(frameSelector: FrameOptions, options?): Frame | null`

Gets a Frame by name or URL. Throws if not found unless `{ force: true }`.

```typescript
const frame = getFrame({ name: 'my-iframe' });
const frame = getFrame({ url: /embed/ });
```

### `getFrameLocator(frameInput: string | FrameLocator): FrameLocator`

Gets a FrameLocator from a selector or existing FrameLocator.

### `getLocatorInFrame(frameInput, input): Locator`

Gets a locator for an element inside a frame.

```typescript
const btn = getLocatorInFrame('#my-iframe', '#submit-btn');
await click(btn); // Works with action utils
```

## Option Types

```typescript
type VisibilityOption = { onlyVisible?: boolean };
type LocatorOptions = PlaywrightLocatorOptions & { onlyVisible?: boolean };
type LocatorWaitOptions = { waitForLocator?: boolean } & TimeoutOption;
type GetByTextOptions = PlaywrightGetByTextOptions & { onlyVisible?: boolean };
type GetByRoleTypes = PlaywrightGetByRoleTypes;
type GetByRoleOptions = PlaywrightGetByRoleOptions & { onlyVisible?: boolean };
type GetByLabelOptions = PlaywrightGetByLabelOptions & { onlyVisible?: boolean };
type GetByPlaceholderOptions = PlaywrightGetByPlaceholderOptions & { onlyVisible?: boolean };
type GetByTitleOptions = PlaywrightGetByTitleOptions & { onlyVisible?: boolean };
type GetByAltTextOptions = PlaywrightGetByAltTextOptions & { onlyVisible?: boolean };
type FrameOptions = PlaywrightFrameOptions; // { name?: string, url?: string | RegExp }
```
