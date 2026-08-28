# Planner Anti-Patterns Reference

> Loaded on demand by the planner when shaping cases — and by the generator and healer for duplicate test-id scoping (anchor priority) and navigation-method patterns. The planner core holds the enforcement rules and the plan→generator contract; this file holds the worked examples and mechanics for Disposition & outcome (c), Spec Organization, Navigation & interaction testing (including route-template families), Page Object Method Granularity, Duplicate test-id detection (anchor priority), Representative scoping anti-pattern, Component host test id, and Implementation Notes (locator fields).
>
> Examples use **Sauce Demo** (`www.saucedemo.com`) as the sample e-commerce app, with **illustrative** locators and URLs (`category-a`, `item-alpha`, etc.) — not live Sauce Demo selectors. Consumer repos may add domain-specific worked examples in their project skill's `planning-context.md`.

## Appendix: Disposition & outcome (c) (plan → generator contract)

Every `###` case carries a **Disposition:** that tells the generator exactly what file action to take. The planner owns this routing decision — it is not left to the generator's file search. The three values:

| Disposition                                       | Generator action                                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `new-spec`                                        | Create the **Target spec:** file (a new spec file) and add this case as a new `test()`. |
| `new-case in <relative spec path>`                | Add a new `test()` to that file's existing `test.describe`.                             |
| `extend "<test() title>" in <relative spec path>` | Append steps/assertions to the body of that existing `test()` — **no new `test()`**.    |

### When to choose `extend` (outcome c) vs `new-case`

Choose `extend` **only** when the new checks share the target test's **user journey and failure mode** — e.g. adding one more post-condition to an end-to-end flow the test already drives. If the new checks have a distinct failure mode, or would make the test cover two intents, use `new-case` instead (one distinct failure mode per test — the same principle as `**Combines:**`). Never `extend` just to avoid creating a new `test()`.

### Worked example — a plan whose cases mix all three

The Coverage delta is the roll-up of the per-case dispositions (one line per case):

```markdown
**Coverage delta:**

- `NEW → <new spec path>`
- `ADD-CASE → <existing spec path> (Apply expired discount code shows error)`
- `EXTEND → <existing spec path>::"applies discount at checkout" (assert discount persists after refresh)`
- `Already covered — not duplicated:` empty-cart guard (existing cart spec)

## Cart Discount @reg

**Target spec:** `<relative spec path>` ← create OR extend; the per-case **Disposition:** is authoritative when cases target different files
**Organization:** One `test.describe` + one shared `beforeEach` (navigate to cart) in the new spec

### Apply valid discount code reduces total

**Disposition:** new-spec

**Steps:** 1. apply a valid code 2. assert the reduced total

### Apply expired discount code shows error

**Disposition:** new-case in <relative spec path>

**Steps:** 1. apply an expired code 2. assert the error message

### Discount persists after page refresh

**Disposition:** extend "applies discount at checkout" in <relative spec path>

**Steps:** (only the new assertions to append — do not repeat the existing test's steps or navigation)

1. `reloadPage()`
2. `expectElementToHaveText(getLocatorByTestId('cart-total'), '$45.00', 'Discount should persist after refresh')`
```

What the generator does with that plan:

- `new-spec` → creates the **Target spec** file with one `test()` for the valid-code case.
- `new-case` → opens the existing spec and adds a new `test('Apply expired discount code shows error', …)` inside its existing `describe`.
- `extend` → opens the existing spec, finds `test('applies discount at checkout', …)`, and appends the two new steps to its body — no new `test()`, and it does not repeat that test's navigation/`beforeEach`.

The completeness gate **counts by disposition**: two new `test()` blocks (`new-spec` + `new-case`) plus one extended body — not three new tests.

## Appendix: Spec Organization (plan → generator contract)

Plans must optimize for **one shared navigation per spec file**, not one page load per test case. The generator produces **one `test.describe` + one `beforeEach` per spec file** when setup is the same.

### Rules

1. **`##` headings are plan sections**, not a mandate for separate `describe` blocks in the spec. Group related checks under fewer `###` cases.
2. **Merge `###` cases** when they share the same starting URL/setup and the same user intent (e.g. footer visible + section headings = one smoke test). **Do not merge visibility with click→navigate checks** — those are distinct failure modes (see § Navigation & interaction testing). **Do not merge navigation cases** that target different destination URLs — each unique href is a distinct failure mode (see the planner Gate 1 reject rules #3–#5 and the Navigation & interaction testing appendix below).
3. **One navigation per merged case** — list all assertions under one `###`; omit repeated `gotoURL` steps inside merged cases (the generator puts navigation in one shared `beforeEach`).
4. **Mark merges explicitly** with `**Combines:**` under the `###` title when folding multiple checks into one generated `test()`.
5. **Separate spec files** (note in Implementation Notes) only when setup truly differs — different auth/storage state, seed, base URL, or tags run in different CI jobs. Never use nested `describe` blocks for this.
6. **Keep distinct `###` cases** when failure isolation matters — e.g. each link group (Section A, Section B, Section C) can stay separate `test()` calls, but still under **one** shared `beforeEach` in the spec. **Click→navigate tests** that leave the page need separate `test()` calls (shared `beforeEach` returns to the start URL); plan one per distinct destination — do not sample one link when hrefs differ.

### Footer example — avoid micro-cases (anti-pattern)

Do **not** plan like this (each becomes a redundant page load in the spec):

```markdown
## Footer Structure and Visibility

### Footer container is visible and accessible

**Steps:** 1. gotoURL ... 2. expect footer visible

## Footer Sections and Headings

### All section headings are present

**Steps:** 1. gotoURL ... 2. expect headings
```

Nine separate `##` sections with one `gotoURL` each caused nine identical `beforeEach` hooks — wasteful and not best practice.

### Footer example — preferred plan shape

```markdown
## Footer @smoke @reg

**Target spec:** `<relative spec path>`
**Organization:** One `test.describe('Footer @smoke @reg')`, one shared `beforeEach` (navigate to homepage). Each `###` below → one `test()` in that describe. No nested describes.

### Footer structure and section headings are present

**Combines:** footer contentinfo visibility + all four section headings (same smoke intent, one navigation)

**Steps:**

1. `expectElementToBeVisible(getLocatorByRole('contentinfo'), 'Footer contentinfo landmark should be visible')`
2. `expectElementToBeVisible(getLocatorByTestId('about-section-heading'), 'About section heading should be visible')`
3. `expectElementToBeVisible(getLocatorByTestId('section-a-heading'), 'Section A heading should be visible')`
4. `expectElementToBeVisible(getLocatorByTestId('section-b-heading'), 'Section B heading should be visible')`
5. `expectElementToBeVisible(getLocatorByTestId('section-c-heading'), 'Section C heading should be visible')`

### About section displays correct content

**Steps:**

1. `expectElementToBeVisible(getLocatorByTestId('about-section-heading'), 'About section heading should be visible')`
2. `expectElementToContainText(getLocatorByRole('contentinfo'), footerData.aboutSectionText, 'About section should display descriptive text')`

### Section A link visibility and href attributes

**Combines:** About Us + Download App link visibility and href (same page, same failure mode — rendering/DOM)

**Spec calls:** one `test()` — call each method below in order (same navigation):

- `verifyAboutUsLink()`
- `verifyDownloadAppLink()`

**Steps:**

1. `expectElementToBeVisible(getLocatorByTestId('about-us-link'), 'About Us link should be visible')`
2. `expectElementToHaveAttribute(getLocatorByTestId('about-us-link'), 'href', urlData.aboutUsUrl, 'About Us link should have correct href')`
3. (repeat for Download App)

### Section C link visibility and href attributes

**Combines:** Section C link visibility + href checks + Create Account button enabled (same footer region; one `test()` with granular `verify*` calls)

**Spec calls:** one `test()` — call each method below in order (same navigation):

- `verifyBlogLink()`
- `verifyCareersLink()`
- `verifySupportLink()`
- `verifyChatLink()`
- `verifyCreateAccountButton()`

**Steps:**

1. (Section C link assertions...)
2. `expectElementToBeEnabled(getLocatorByTestId('create-account-button-footer'), 'Create Account button should be enabled')`
```

This yields four grouped visibility/href `test()` calls under one shared `beforeEach` — no per-link `clickAndNavigate` case. A footer/link-catalog plan is page chrome, not the tested journey (the planner's chrome-vs-journey rule): the `href` assertion in each grouped case **is** the destination coverage. The 6–8 ceiling applies to the whole plan; per-link granularity lives in `**Spec calls:**` inside each grouped case, not as separate `###` cases.

### Footer example — anti-pattern (claiming navigation coverage for href-only checks)

Do **not** plan like this for a footer/link-catalog plan:

```markdown
**Organization:** navigation cases separate per destination URL
**Scope justification:** 26 navigation cases — each link has a distinct destination URL

### Products section links

**Combines:** All Products section link visibility and href validation

**Steps:**

1. `expectElementToBeVisible(...'Anaconda Platform'...), '...')`
2. `expectElementToHaveAttribute(...'Anaconda Platform'...), 'href', footerData.platformUrl, '...')`
3. (repeat for Capabilities, Professional Services, Pricing — visibility + href only)
```

Wrong: `**Organization:**` and `**Scope justification:**` claim "navigation" and count 26 "navigation cases," but no `###` contains `clickAndNavigate` — this is href-only page-chrome coverage mislabeled as navigation. The fix is to **relabel**, not to add 26 `clickAndNavigate` cases: `**Combines:**` and `**Organization:**` should say **visibility and href**, and there is no `**Scope justification:**` to write, because grouped href checks stay within the 6–8 cap (see the chrome-vs-journey rule and the preferred footer shape above). Only claim "navigation" — or write a `**Scope justification:**` for a navigation layer — when a `###` actually contains `clickAndNavigate`, which a footer/link-catalog plan does not need.

## Appendix: Navigation & interaction testing (plan → generator contract)

Visibility and click→navigate are **distinct failure modes** — plan both for clickable UI (links, buttons, cards, tiles). The planner core (Gate 1 ledger, reject rules, and navigation digest) holds the decisions; this appendix holds the plan shape and the full all-vs-representative decision tree.

### Rules

1. **Plan visibility and navigation separately** — visibility checks (`expectElementToBeVisible`, `expectElementToHaveAttribute` for `href`) catch rendering/DOM issues; navigation checks (`clickAndNavigate` + URL assertion) catch routing/handler issues. Use `expectPageToHaveURL` for exact string destinations or explicit regex patterns; use `expectPageToContainURL` for partial URL matching. `expectPageToContainURL` treats a string as a regex source, so wrap literal fragments with regex metacharacters in `new RegExp(escapeRegExp(value))`. **Duplicate test ids:** when `dupCount > 1`, use the **same** scoped locator for visibility and click — see § Duplicate test-id detection (anchor priority).
2. **Curated content navigation** — test navigation for **all** links with **different destination URLs** in fixed small sets where clicking through **is** the tested journey (featured product cards, category tiles, primary nav — typically ≤10 items). Do **not** apply representative sampling within these sections. **Not** curated content navigation: **link/footer catalogs** (page chrome — footer, social icons, legal links, resource lists) get grouped visibility + `href` instead, per the chrome-vs-journey rule — see § Spec Organization's footer example. **Exception:** search suggestion chips and other **route-template families** are not curated content navigation either — see rule 7.
3. **Long homogeneous lists** — representative sampling may apply when items are interchangeable and links share the same route template (differing only by slug/id), not when the section is a small curated set with distinct destination URLs.
4. **Separate `###` per navigation target** — each click leaves the page; one `test()` per destination with shared `beforeEach` returning to the start URL. Combine only same-page visibility checks (see § Spec Organization).
5. **One action + one `verify*` method per navigation target** — e.g. `clickCategoryATile()` (action only) + `verifyCategoryAPage()` (URL assertion only); `clickProductACard()` + `verifyProductADetailPage()` — not one representative `clickFirstCategory()` / `verifyFirstCategoryPage()`, and **never** a bundled `navigateToCategoryA()` that mixes `clickAndNavigate` with `expectPage*`.
6. **Scope class ceiling** — when a curated content navigation set's case count exceeds its ceiling, add a suite-level `**Scope justification:**` line in the plan (each destination is feature-critical) or split into separate spec files. Do **not** cut curated-section navigations to fit the ceiling without that justification. **Do not** cut the sole representative navigation case for a route-template family to fit the ceiling — that case is mandatory. Link/footer catalogs are a separate scope class (grouped visibility + `href`, 6–8 hard cap) — they have no navigation layer to exceed.
7. **Route-template families** (search suggestion chips, quick-search pills, filter tags) — a small fixed set (typically ≤10) of clickables sharing one route/path where only query param, slug, or filter value varies. Plan **all** item visibility (merged in one `###` is fine) **and** **exactly one** separate `###` navigation case (`clickAndNavigate` + `expectPageToContainURL`). Reject additional permutations; note in coverage delta: `Already covered — not duplicated: individual <items> beyond representative (same routing pattern)`. Representative means **keep one** nav case — never zero.

### Decision tree (all vs. representative)

Walk this in order when deciding whether every clickable in a set gets its own navigation `###` or one representative suffices. **This tree applies to curated content navigation and route-template families — link/footer catalogs (page chrome) skip it entirely and get grouped visibility + `href` per the chrome-vs-journey rule, never a navigation layer:**

1. Is this **curated content navigation** — a fixed small set of top-level nav targets where clicking through **is** the tested journey, typically ≤10 items, each with a **different destination URL** (different path or materially different route)?
   - YES → Test navigation for **every item** (each unique href). Examples: category tiles, featured product cards, primary nav.
   - NO → Continue

2. Is this a **route-template family** — a small fixed set of clickables (typically ≤10 items) that share the **same route/path** and differ only by query param, slug, or filter value? (e.g. hero **search suggestion chips**, quick-search pills, filter tags)
   - YES → **Mandatory minimum:** plan chip/link **visibility** for all items (merged in one `###` is fine) **and** plan **exactly one** separate `###` navigation case (`clickAndNavigate` + URL assertion) using one representative item (e.g. first filter chip). Reject additional permutations (other chips with the same route pattern) as same root cause. Record in the coverage delta: `Already covered — not duplicated: individual <items> beyond representative (same routing pattern)`. **Never** drop the sole representative nav case when consolidating scope — the planner's Gate 1 reject rule #4 (representative validation) means one kept case, not zero.
   - NO → Continue

3. Is this a long paginated/search list (dozens+ homogeneous rows) where links share the same route template and differ only by slug/id?
   - YES → A small representative sample (e.g., 1–3) may suffice
   - NO → Test navigation for all unique destinations
4. Does the total case count exceed the default curated-content-navigation ceiling (typically ≤10 dedicated navigation cases)?
   - Add a suite-level `**Scope justification:**` line explaining why each extra destination is feature-critical, or split if the set is not one coherent slice
   - Never cut unique-destination navigation cases just to fit the default when the overage is justified
   - Link/footer catalogs don't reach this step — they're a separate scope class with their own 6–8 hard cap achieved by grouping (e.g. footer with 15 links → Section A / Section B / Section C); see § Spec Organization's footer example.

### Homepage example — anti-pattern (visibility only)

Do **not** plan like this for category tiles or product cards:

```markdown
### Featured categories section displays category tiles

**Combines:** section heading + all three category headings visible

**Steps:**

1. `expectElementToBeVisible(getLocatorByTestId('categories-section-heading'), '...')`
2. `expectElementToBeVisible(getLocatorByTestId('category-a'), '...')`
3. `expectElementToBeVisible(getLocatorByTestId('category-b'), '...')`
```

Missing: click→navigate for category-a, category-b, and category-c — each goes to a **different** category URL.

### Homepage example — anti-pattern (visibility only for search suggestion chips)

Do **not** plan like this when hero search chips are clickable shortcuts to search results:

```markdown
### Hero section displays heading and search input with suggestion chips

**Combines:** Hero heading visibility, search input visibility, and search suggestion chip functionality

**Steps:**

1. `expectElementToBeVisible(heroHeading, '...')`
2. `expectElementToBeVisible(searchInput, '...')`
3. `expectElementToBeVisible(getLocatorByTestId('search-for-laptops'), '...')`
4. `expectElementToBeVisible(getLocatorByTestId('search-for-phones'), '...')`
```

Wrong: `**Combines:**` claims "functionality" / "interaction" but steps are visibility-only. Missing: a separate `###` with `clickAndNavigate(getLocatorByTestId('search-for-laptops'))` + URL assertion. Folding chip visibility into the hero case does **not** cover routing — visibility and click→navigate are distinct failure modes. During scope consolidation, do **not** drop the representative chip-nav case and leave only visibility.

### Homepage example — anti-pattern (bare document-wide role link)

Do **not** plan when core eval returned `{ testId: "item-a", dupCount: 2, href: "/items/item-a" }`:

```markdown
**Locator note:** tier-7 — no stable data-qa-id on the link wrapper.

**Steps:**

1. `clickAndNavigate(getLocatorByRole('link', { name: /Item A logo Item A/i }))`
```

Use anchor priority § Duplicate test-id detection — priority 3 `a:has([data-qa-id="item-a"])` when the id is on an inner heading, not bare role.

### Homepage example — anti-pattern (one product represents all four)

Do **not** plan like this for featured products:

```markdown
### Clicking product-a card navigates to product detail page

**Locator note:** tier-7 — illustrative only; product-a alone does not cover all four featured products.

**Steps:**

1. `clickAndNavigate(getLocatorByRole('link', { name: /product-a/i }))`
2. `expectPageToContainURL(productData.productADetailPath, 'Should navigate to product-a detail page')`
```

Missing: product-b, product-c, and product-d — each card links to a **different** product detail URL. Wrong rationale: "all cards use the same component" or "product-a represents the pattern." Featured products is a **curated set of 4** top-level homepage targets — plan all four, same as all three category tiles.

### Homepage example — preferred plan shape

**URL assertions:** category pages use `expectPageToHaveURL` (exact destination); product detail pages use `expectPageToContainURL` (detail URLs may include query params or trailing path segments).

```markdown
## Sauce Demo Homepage @smoke

**Target spec:** `<relative spec path>`
**Organization:** One `test.describe` + one shared `beforeEach`
**Scope justification:** seven navigation cases (3 categories + 4 products) — each link has a distinct destination URL; visibility cases stay merged; navigation cases stay separate. Curated sections are not reduced to one representative.

### Featured categories section displays category tiles

**Disposition:** new-spec

**Combines:** section heading visibility + all three category headings visible (same page, same failure mode — rendering)

**Steps:**

1. `expectElementToBeVisible(getLocatorByTestId('categories-section-heading'), 'Featured categories heading should be visible')`
2. `expectElementToHaveText(getLocatorByTestId('categories-section-heading'), categoryData.sectionHeading, 'Section heading should display correct text')`
3. (visibility for each category heading — category-a, category-b, category-c)

### Clicking category-a tile navigates to category page

**Disposition:** new-case in <target spec path>

**Test data:** `categoryData.categoryAUrl`

**Locator scope:** duplicate `category-a` — priority 3 structural anchor `.card-grid a.card-link:has([data-qa-id="category-a"])`. Same anchor for visibility (`.locator('[data-qa-id="category-a"]')`) and click. Footer duplicate: separate case with priority 2 `contentinfo` scope.

**Steps:**

1. `clickAndNavigate('.card-grid a.card-link:has([data-qa-id="category-a"])')`
2. `expectPageToHaveURL(categoryData.categoryAUrl, 'Should navigate to category-a page')`

### Clicking category-c tile navigates to category page

**Disposition:** new-case in <target spec path>

**Test data:** `categoryData.categoryCUrl`

**Locator scope:** no `data-qa-id` on category-c tile via core eval — region-scoped href fallback: `.card-grid a[href="/categories/category-c"]`. Do not use document-wide href or bare role.

**Steps:**

1. `clickAndNavigate('.card-grid a[href="/categories/category-c"]')`
2. `expectPageToHaveURL(categoryData.categoryCUrl, 'Should navigate to category-c page')`

(repeat for category-b — and for each featured product card with a distinct detail URL)

### Clicking product-b card navigates to product detail page

**Disposition:** new-case in <target spec path>

**Test data:** `productData.productBDetailPath`

**Locator scope:** tier-1 compound when product title has test id — `.products-grid a:has([data-qa-id="product-b"])`. Region prefix required when Step 3 count > 1.

**Steps:**

1. `clickAndNavigate('.products-grid a:has([data-qa-id="product-b"])')`
2. `expectPageToContainURL(productData.productBDetailPath, 'Should navigate to product-b detail page')`

(repeat for product-a, product-c, and product-d — all four featured products, not product-a alone)
```

### Homepage example — preferred plan shape (search suggestion chips)

Route-template family — five chips share `/search` (query param varies). Visibility merged; **one** representative navigation case required:

```markdown
**Coverage delta:**

- `NEW → <target spec path> (Hero section displays heading, search input, and search suggestion chip visibility)`
- `ADD-CASE → <target spec path> (Laptops search suggestion chip navigates to search results)`
- `Already covered — not duplicated:` individual search chips beyond representative (same routing pattern)

### Hero section displays heading, search input, and search suggestion chip visibility

**Disposition:** new-spec

**Combines:** Hero heading visibility, search input visibility, and search suggestion chip visibility

**Steps:**

1. `expectElementToBeVisible(heroHeading, 'Hero heading should be visible')`
2. `expectElementToBeVisible(searchInput, 'Search input should be visible')`
3. (visibility for each chip — laptops, phones, tablets, accessories, deals)

### Laptops search suggestion chip navigates to search results

**Disposition:** new-case in <target spec path>

**Test data:** `searchData.searchResultsPath`, `searchData.laptopsQuery`

**Steps:**

1. `clickAndNavigate(getLocatorByTestId('search-for-laptops'))`
2. `expectPageToContainURL(searchData.searchResultsPath, 'Should navigate to search results page')`
3. `expectPageToContainURL(searchData.laptopsQuery, 'URL should contain laptops search query')`

**Spec calls:** clickLaptopsSearchChip(), verifyLaptopsSearchResultsPage()

**Implementation Notes:**

- `clickLaptopsSearchChip(): Promise<void>` — click laptops search chip (action only)
- `verifyLaptopsSearchResultsPage(): Promise<void>` — verify search results URL (assertion only)
```

Do **not** plan navigation for phones, tablets, accessories, and deals — same route template. Do **not** merge the laptops chip click into the hero visibility `###`.

---

### Implementation Notes (navigation methods)

**Page object:** `HomePage`

**Navigation methods** — one `click*` + one `verify*` per destination; no representative wrapper; no bundled `navigateTo*` methods:

- `clickCategoryATile(): Promise<void>` — `clickAndNavigate` only
- `verifyCategoryAPage(): Promise<void>` — `expectPageToHaveURL(categoryData.categoryAUrl, ...)`
- `clickCategoryCTile(): Promise<void>` — `clickAndNavigate` only
- `verifyCategoryCPage(): Promise<void>` — `expectPageToHaveURL(categoryData.categoryCUrl, ...)`
- `clickProductACard(): Promise<void>` — `clickAndNavigate` only
- `verifyProductADetailPage(): Promise<void>` — `expectPageToContainURL(productData.productADetailPath, ...)`
- `clickProductBCard(): Promise<void>` — `clickAndNavigate` only
- `verifyProductBDetailPage(): Promise<void>` — `expectPageToContainURL(productData.productBDetailPath, ...)`

**Spec calls (per navigation `###`):** list the action then the verify method in order — e.g. `clickCategoryATile(), verifyCategoryAPage()`.

**Do not plan:** bundled `navigateToCategoryA()`-style methods; `clickFirstCategory()` / `verifyFirstCategoryPage()` representative wrappers; or test only product-a when all four featured products have different detail URLs.

### Navigation example — anti-pattern (bundled action + assertion)

Do **not** plan or generate:

```markdown
**Methods:**

- `navigateToCategoryA(): Promise<void>` — click category-a tile and verify navigation to category page
```

```typescript
// ❌ Wrong — assertion mixed into action method
async navigateToCategoryA(): Promise<void> {
  await clickAndNavigate(this.categoryATile);
  await expectPageToContainURL(categoryData.categoryA.url, 'Should navigate to category-a page');
}
```

### Navigation example — preferred plan shape

```markdown
### Clicking category-a tile navigates to category page

**Spec calls:** clickCategoryATile(), verifyCategoryAPage()

**Steps:**

1. `clickAndNavigate('.card-grid a.card-link:has([data-qa-id="category-a"])')`
2. `expectPageToHaveURL(categoryData.categoryAUrl, 'Should navigate to category-a page')`

**Implementation Notes:**

**Methods:**

- `clickCategoryATile(): Promise<void>` — click category-a tile
- `verifyCategoryAPage(): Promise<void>` — verify navigation to category-a page
```

## Appendix: Page Object Method Granularity (plan → generator contract)

When a test case covers **many similar items** (footer links, social icons, table rows), split page-object work into **one `verify*` method per item** — not one giant method with all assertions inlined.

### Rules

1. **Plan lists granular page-object methods** in Implementation Notes (e.g. `verifyFacebookSocialLink()`, `verifyTwitterSocialLink()`).
2. **Plan lists spec calls** on multi-item cases via the plan key **Spec calls:**; the generator writes the spec calling each method explicitly (readability in the test file).
3. **One plan `###` → one spec `test()`** (for a `new-spec` / `new-case` case; an `extend` case appends to an existing `test()` instead — see § Disposition & outcome (c)) — multiple `verify*` calls inside that single test (one navigation via shared `beforeEach`). For **same-page** href/visibility checks, combine links in one `test()` via `**Spec calls:**`. For **click→navigate** checks with different destinations, use separate `test()` calls (each leaves the page — see § Navigation & interaction testing).
4. **No aggregator methods** — do not plan `verifySocialMediaLinks()` that embeds every link's assertions. The spec orchestrates; each link owns its own `verify*` method.
5. **Declare locators once** — note in Implementation Notes that each link uses a `private readonly` locator field (arrow function wrapping `getLocatorByTestId()`), reused inside its `verify*` method.

### Social media example — anti-pattern

Do **not** plan or generate:

```markdown
**Verification methods:**

- `verifySocialMediaLinks()` — all six platforms in one 90-line method
```

```typescript
// ❌ Spec hides what is being checked
test('social media links are present and valid', async ({ siteFooterPage }) => {
  await siteFooterPage.verifySocialMediaLinks();
});
```

### Social media example — preferred plan shape

```markdown
### Social media links are present and valid

**Spec calls:** one `test()` — call each method below in order (same navigation):

- `verifyFacebookSocialLink()`
- `verifyTwitterSocialLink()`
- `verifyLinkedInSocialLink()`
- `verifyGitHubSocialLink()`
- `verifyInstagramSocialLink()`
- `verifyYouTubeSocialLink()`

**Steps:**

1. `expectElementToHaveAttribute(getLocatorByTestId('social-facebook'), 'href', linkData.facebookUrl, 'Facebook link should have correct href')`
2. `expectElementToHaveAttribute(getLocatorByTestId('social-facebook'), 'target', '_blank', 'Facebook link should open in new tab')`
3. `expectElementToBeVisible(getLocatorByTestId('social-facebook'), 'Facebook link should be visible')`
4. (repeat pattern for Twitter — use `expectElementToContainAttribute` for partial href when needed — LinkedIn, GitHub, Instagram, YouTube)

**Expected:**

- All six social links have correct href, `target="_blank"`, and are visible

---

## Implementation Notes

**Page object:** `SiteFooterPage`

**Locators:** `private readonly facebookSocialLink = () => getLocatorByTestId('social-facebook')` (and one field per social link)

**Verification methods (granular — no aggregator):**

- `verifyFacebookSocialLink()` — href, target, visible
- `verifyTwitterSocialLink()` — contain href, target, visible
- `verifyLinkedInSocialLink()` — href, target, visible
- `verifyGitHubSocialLink()` — href, target, visible
- `verifyInstagramSocialLink()` — href, target, visible
- `verifyYouTubeSocialLink()` — contain href, target, visible

**Do not plan:** `verifySocialMediaLinks()` wrapper that duplicates all of the above.
```

Apply the same pattern to other link groups (Section A, Section B, Section C, Legal) when each group has three or more links.

## Appendix: Duplicate test-id detection (strict mode prevention)

The same `data-qa-id` value can appear on **multiple elements** (main content + footer, list + detail, title inside a link + catalog link elsewhere). Bare `getLocatorByTestId('item-alpha')` fails **strict mode** for visibility and actions alike — Playwright requires a single match for `expectElementToBeVisible`, `click`, and `clickAndNavigate`.

### Rules

1. **Count before you plan.** Core eval returns `dupCount`. Count **1** → bare `getLocatorByTestId('id')` when appropriate. Count **> 1** → **must scope** — for **visibility and actions**.
2. **Same scoped locator for visibility and actions.** Do not plan bare test id for `expectElementToBeVisible` and a different compound for `clickAndNavigate` on the same target. One anchor, one page-object field; chain `.locator(...)` when the assertion target is an inner node (heading, label) inside the anchor.
3. **Anchor priority when `dupCount > 1`** — pick the first that passes containment / Step 3 count = 1:

   | Priority                          | When                                                                                                                                      | Pattern                                                                                                                         | Visibility target                                                                           | Click target                                                                                                                   |
   | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
   | **1. Test-id ancestor**           | A parent `data-qa-id` is a **true DOM container** (containment check passes)                                                              | `getLocatorByTestId('parent').locator('[data-qa-id="target"]')`                                                                 | Same composed locator as Pattern                                                            | Same composed locator as Pattern (optionally `.locator('a')` / `.locator('button')` when the click target is a nested control) |
   | **2. Landmark or region**         | No test-id wrapper; verified landmark or CSS region contains exactly one match                                                            | `getLocatorByRole('contentinfo').locator('[data-qa-id="target"]')` or `getLocator('{region}').locator('[data-qa-id="target"]')` | Same composed locator as Pattern                                                            | Same composed locator as Pattern                                                                                               |
   | **3. Structural parent compound** | Target test id is on a **descendant** of the interactive wrapper (core eval often returns `href` on nearest `<a>`); priorities 1–2 failed | `{region} a:has([data-qa-id="target"])` or `a:has([data-qa-id="target"])`                                                       | Anchor `.locator('[data-qa-id="target"]')` — inner node (heading, label) inside the wrapper | Anchor alone — the wrapping `<a>` (or `{region} a:has(...)`)                                                                   |

   **Priorities 1–2:** one locator for visibility **and** actions — the Pattern column is the page-object field; there is no inner-node vs wrapper split. **Priority 3:** the test id sits on a descendant inside a wrapping link — chain `.locator('[data-qa-id="target"]')` for assertions on the inner node; use the `a:has(...)` anchor alone for `click` / `clickAndNavigate`.

   This is the full form of the anchor-priority table; the compact 3-row version is in `.claude/skills/playwright-cli/references/element-attributes.md` § Duplicate test-id scoping. Keep the two in sync.

4. **Verify ancestor containment before priority 1.** Section-heading test ids often label an `H2`/`H3`/`H4` and do **not** wrap their siblings — containment check must pass before chaining from them.
5. **Record scope in the plan.** Add `**Locator scope:**` on affected `###` cases; name anchor type + pattern. Implementation Notes declare one `private readonly` field per scoped locator.
6. **Plan steps use the scoped locator** — full expression as the `selector` argument to `expect*` and action functions.
7. **Re-verify with Step 3** — count matches on the **composed** selector, not document-wide:
   ```bash
   playwright-cli eval "document.querySelectorAll('[data-qa-id=channel-list] [data-qa-id=channel-item]').length"
   # => 1  → proceed
   # => 0  → ancestor does not contain target; try next priority
   # => >1 → tighten (add region, structural compound, or another ancestor)
   ```
8. **Never paper over duplicates** — no bare `getLocatorByTestId` when `dupCount > 1`; no `.first()` / `.nth()` / `.last()` unless no anchor resolves to 1 (last resort + comment).
9. **Document-wide locators forbidden** when they identify a destination or label, not a specific instance: bare `a[href="…"]`, document-wide `getLocatorByRole('link', …)`, document-wide `getLocatorByText`. Scope via anchor priority or `{region}` prefix. See `.claude/skills/anaconda-playwright-utils/references/locators.md` § Tile and card navigation links for href-specific rationale.
10. **Per-ref eval in homogeneous sections.** Items in the same grid/list (same reusable component) each need Step 1 evidence — run core eval on **each** ref, or batch-map ids under the section then apply anchor priority **per target id**. One scoped item does not define the locator strategy for siblings.

### Representative scoping anti-pattern (one eval, siblings templated)

Do **not** plan a curated set like this:

```markdown
### item-a is visible and navigates

**Locator scope:** `item-a` dupCount 2. Priority 3: `a:has([data-qa-id="item-a"])`

**Steps:**

1. clickAndNavigate(getLocator('a:has([data-qa-id="item-a"])'))

### item-b is visible and navigates

**Locator note:** tier-7 — no data-qa-id confirmed via eval on item-b card

**Steps:**

1. clickAndNavigate(getLocatorByRole('link', { name: /Item B logo/i }))
```

Wrong: item-b was never core-eval'd (or eval was skipped). Same component ⇒ same DOM pattern ⇒ run Step 1 on item-b's ref. If core eval returns `{ testId: "item-b", dupCount: 2, href: "…" }`, plan `a:has([data-qa-id="item-b"])` — not tier-7 role.

**Gate 2 fails** when one case in a homogeneous section uses anchor priority and a sibling uses bare `getLocatorByRole('link', …)` without per-item eval proving a different anchor outcome.

### Preferred — eval each item (or batch then per-id anchor)

```markdown
### item-b is visible and navigates

**Locator scope:** `item-b` dupCount 2 (content H3 + footer link). Priority 3 — same strategy as item-a:
`a:has([data-qa-id="item-b"])`

**Steps:**

1. clickAndNavigate(getLocator('a:has([data-qa-id="item-b"])'))
```

Batch shortcut (after section container ref e203):

```bash
playwright-cli eval "el => [...el.querySelectorAll('[data-qa-id]')].map(n => ({ tag: n.tagName, id: n.getAttribute('data-qa-id') }))" e203
# => [{ tag: "H3", id: "item-a" }, { tag: "H3", id: "item-b" }, ...]
# Then run Step 1 on one ref per distinct id (or per planned click target) — do not skip ids present in batch output
```

### Decision flow (`dupCount > 1`)

```text
Core eval on target ref
├─ Priority 1: candidate parent test id + containment check passes
│  └─ getLocatorByTestId('parent').locator('[data-qa-id="target"]')  →  Step 3 count = 1 ? use : try P2
├─ Priority 2: verified landmark or CSS region contains target once
│  └─ getLocatorByRole('contentinfo').locator('[data-qa-id="target"]')  or  getLocator('{region}').locator('…')  →  Step 3 count = 1 ? use : try P3
├─ Priority 3: target id on descendant; core eval href set on wrapping <a>
│  ├─ Visibility: getLocator('a:has([data-qa-id="target"])').locator('[data-qa-id="target"]')
│  └─ Click:     getLocator('a:has([data-qa-id="target"])')  or  '{region} a:has([data-qa-id="target"])'  →  Step 3 count = 1 ? use
└─ All priorities exhausted or Step 3 count ≠ 1 for every candidate
   → revise anchor (tighten {region} / retry next priority); then follow the exhaustion order in
     element-attributes.md § Duplicate test-id scoping — region-scoped tier 7 with **Locator note:** first,
     tightest anchor + .first() with a comment only after that
```

### item-alpha example — anti-pattern (bare test id + generator `.first()`)

Do **not** plan:

```markdown
**Steps:**

1. `expectElementToBeVisible(getLocatorByTestId('item-alpha'), 'item-alpha heading should be visible')`
```

Do **not** generate `getLocatorByTestId('item-alpha').first()` — that is not anchoring; it picks DOM order.

`item-alpha` also exists on a footer link — strict mode fails on bare test id.

### item-alpha — priority 1 (test-id ancestor)

When containment check passes:

```markdown
**Locator scope:** `item-alpha` duplicated across lists. Scope under verified container `item-list`:
`getLocatorByTestId('item-list').locator('[data-qa-id="item-alpha"]')`

**Steps:**

1. `expectElementToBeVisible(getLocatorByTestId('item-list').locator('[data-qa-id="item-alpha"]'), 'item-alpha should be visible in list')`
2. `click(getLocatorByTestId('item-list').locator('[data-qa-id="item-alpha"]'))`
```

### nav-item-alpha — priority 2 (landmark; containment on heading failed)

`section-c-heading` is an `H4` heading — containment check returns `false`. Verify the footer landmark:

```bash
playwright-cli eval "document.querySelectorAll('[data-qa-id=section-c-heading] [data-qa-id=nav-item-alpha]').length"
# => 0  → section-c-heading is not a wrapper; discard priority 1
playwright-cli eval "document.querySelectorAll('footer [data-qa-id=nav-item-alpha]').length"
# => 1  → priority 2 landmark anchor
```

```markdown
**Locator scope:** `nav-item-alpha` appears in main content and footer. Footer target: priority 2 —
`getLocatorByRole('contentinfo').locator('[data-qa-id="nav-item-alpha"]')`

**Steps:**

1. `expectElementToContainAttribute(getLocatorByRole('contentinfo').locator('[data-qa-id="nav-item-alpha"]'), 'href', urlData.supportUrl, 'Support link href should point to support page')`
2. `clickAndNavigate(getLocatorByRole('contentinfo').locator('[data-qa-id="nav-item-alpha"]'))`
```

### item-alpha — priority 3 (structural parent compound)

When the test id is on an inner `<h3>` inside a wrapping `<a>`, and a duplicate carries the id on the `<a>` itself elsewhere (priorities 1–2 unavailable):

```markdown
**Locator scope:** `item-alpha` duplicated (content `<h3>` + footer `<a>`). Priority 3 structural anchor.
Visibility and click share the same wrapper field; visibility chains to inner id.

**Implementation Notes:**

- `itemAlphaWrapper = 'a:has([data-qa-id="item-alpha"])'`
- `itemAlphaHeading = () => getLocator(this.itemAlphaWrapper).locator('[data-qa-id="item-alpha"]')`

**Steps:**

1. `expectElementToBeVisible(getLocator('a:has([data-qa-id="item-alpha"])').locator('[data-qa-id="item-alpha"]'), 'item-alpha heading should be visible')`
2. `clickAndNavigate('a:has([data-qa-id="item-alpha"])')`
```

```bash
playwright-cli eval "document.querySelectorAll('a:has([data-qa-id=item-alpha])').length"
# => 1  → proceed
# => >1 → prefix with verified region: '.feature-grid a:has([data-qa-id=item-alpha])'
```

### category-a — anti-pattern (document-wide href)

Do **not** plan `a[href="/categories/category-a"]` document-wide — use anchor priority. When priority 3 applies: `.card-grid a:has([data-qa-id="category-a"])`. When no test id: `{region} a[href="…"]`, never document-wide.

---

## Appendix: Implementation Notes (locator fields)

When a test id is duplicated, page-object fields must use the **same anchor** for visibility and actions. **Always verify the ancestor is a container, not just a heading** (see `.claude/skills/playwright-cli/references/element-attributes.md` § Duplicate test-id scoping):

```typescript
// ❌ strict mode — id reused on page body and footer
// private readonly navItemAlphaLink = () => getLocatorByTestId('nav-item-alpha');

// ❌ generator workaround — not anchoring
// private readonly itemAlphaHeading = () => getLocatorByTestId('item-alpha').first();

// ✅ priority 1 — test-id ancestor (containment check passes)
private readonly categoryItem = () =>
  getLocatorByTestId('category-list').locator('[data-qa-id="category-item"]');

// ✅ priority 2 — landmark (footer target)
private readonly navItemAlphaLink = () =>
  getLocatorByRole('contentinfo').locator('[data-qa-id="nav-item-alpha"]');

// ✅ priority 3 — structural parent; visibility chains to inner id, click uses wrapper
private readonly itemAlphaWrapper = 'a:has([data-qa-id="item-alpha"])';
private readonly itemAlphaHeading = () =>
  getLocator(this.itemAlphaWrapper).locator('[data-qa-id="item-alpha"]');
```

---

## Appendix: Component host test id

When `data-qa-id` is on a **component host** (custom element / wrapper) and the accessibility snapshot ref is the **inner** interactive control, planner, generator, and healer all follow `.claude/skills/playwright-cli/references/element-attributes.md` § Attribute Discovery Workflow Step 2 — one scoped locator for visibility and fill.

### Discovery

Run **core eval** (`element-attributes.md` § Step 1) on the snapshot ref — check `onHost`, `testId`, `tag`, `role` in the JSON:

```bash
# => { onHost: true, testId: "search-input", tag: "INPUT", role: "combobox", dupCount: 1, ... }
```

### Plan pattern

```markdown
**Locator scope:** `search-input` on `<kendo-autocomplete>` host; chain to inner combobox for all steps.

**Steps:**

1. expectElementToBeVisible(getLocatorByTestId('search-input').locator('input[role="combobox"]'), 'Search input should be visible')
2. fill(getLocatorByTestId('search-input').locator('input[role="combobox"]'), searchData.query)
```

### Page-object field (same in generator output and heal fixes)

```typescript
// ❌ tier 7 — inner ref has no test id; host does
// private readonly searchInput = () => getLocatorByRole('combobox', { name: 'Search for products' });

// ❌ bare host — fill() may miss the inner input on Kendo/Angular wrappers
// private readonly searchInput = () => getLocatorByTestId('search-input');

// ✅ tier 1 host + scoped inner — visibility AND fill
private readonly searchInput = () =>
  getLocatorByTestId('search-input').locator('input[role="combobox"]');
```

**Do not** plan separate host vs inner locators unless asserting wrapper chrome (prefix icon, suffix button) separately from the input — one scoped field is the default.

When the host id is itself duplicated (`dupCount > 1`), anchor the host first per `element-attributes.md` § Duplicate test-id scoping, then chain the inner control off the anchored host — e.g. `getLocator('header [data-qa-id="search-input"]').locator('input[role="combobox"]')`.
