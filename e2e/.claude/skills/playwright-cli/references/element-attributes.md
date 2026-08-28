# Inspecting Element Attributes

Accessibility snapshots show role, name, and refs — but **often omit `data-qa-id` and other DOM attributes**. Never assume an element has no test id because the snapshot does not show one. Use `eval` to read attributes before writing locators in test plans or page objects.

In Anaconda projects, `getLocatorByTestId()` is typically configured to target `data-qa-id` via `use.testIdAttribute` (often through `AnacondaProjectDefaults`), so always check for `data-qa-id` first.

**Canonical workflow:** Planner, generator, healer, and refactor all follow this file — do not invent a parallel discovery path in agent files.

## Attribute Discovery Workflow (planner · generator · healer)

Three steps per element: **core eval** → **apply rules** → **verify selector**. Same flow everywhere — no agent-specific shortcuts.

**Per-ref rule:** Step 1 runs on **every element ref** that will appear in plan steps. In homogeneous sections (N items, same component, same page region), eval **each** item ref — or batch-map test ids under the section container, then run Step 1 + anchor priority for **each distinct target id** you will plan. **Never** infer tier-7 for siblings because the first item in the set was scoped differently.

### Step 1 — Core eval (one call per snapshot ref)

Run this **once** on every element ref before writing a locator. It replaces separate `closest()`, component-host, and duplicate-count evals.

```bash
playwright-cli snapshot
# combobox "Search for packages" [ref=e42] — run core eval:

playwright-cli eval "el => {
  const selfId = el.getAttribute('data-qa-id');
  const host = el.closest('[data-qa-id]');
  const hostId = host?.getAttribute('data-qa-id') ?? null;
  const testId = selfId ?? hostId;
  const ancestorId = (host ?? el).parentElement?.closest('[data-qa-id]')?.getAttribute('data-qa-id') ?? null;
  const tag = el.tagName;
  const role = el.getAttribute('role');
  const link = el.closest('a') ?? (tag === 'A' ? el : null);
  return {
    selfId,
    hostId,
    testId,
    ancestorId,
    onHost: !selfId && !!hostId,
    tag,
    role,
    dupCount: testId ? document.querySelectorAll('[data-qa-id=' + JSON.stringify(testId) + ']').length : 0,
    href: link?.getAttribute('href') ?? null
  };
}" e42
```

Example results:

```jsonc
// Kendo search input — component host
{ "selfId": null, "hostId": "search-input", "testId": "search-input", "ancestorId": null, "onHost": true, "tag": "INPUT", "role": "combobox", "dupCount": 1, "href": null }

// item-alpha title (h3 inside link) — ancestorId is the priority-1 candidate when dupCount > 1
{ "selfId": "item-alpha", "hostId": "item-alpha", "testId": "item-alpha", "ancestorId": "item-list", "onHost": false, "tag": "H3", "role": null, "dupCount": 2, "href": "/items/item-alpha" }
```

### Step 2 — Apply rules from core output

Use the JSON from Step 1 with the decision table below and the pattern sections in `.claude/skills/anaconda-playwright-utils/references/locators.md`. **Do not** run separate duplicate-count or component-host evals — `dupCount` and `onHost` are already in core output. **Apply the first matching row, top to bottom.**

| Core output                                                                           | Action                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onHost: true` **and** `dupCount > 1`                                                 | **Duplicated component host** — anchor the host first (§ Duplicate test-id scoping), then chain the inner control off the anchored host — e.g. `getLocator('header [data-qa-id="search-input"]').locator('input[role="combobox"]')`                               |
| `onHost: true` + `INPUT` / `TEXTAREA` / `SELECT` / `role: combobox` / `role: textbox` | **Component host** — chain inner control (§ below); never tier 7                                                                                                                                                                                                  |
| `testId` set + `dupCount === 1` + `onHost: false`                                     | **Bare test id** — `getLocatorByTestId('testId')` when ref is the target                                                                                                                                                                                          |
| `testId` set + `dupCount > 1`                                                         | **Anchor priority** — apply § Duplicate test-id scoping for **visibility and actions** (same scoped locator). Never bare test id; never `.first()` / `.nth()` to paper over duplicates                                                                            |
| No `testId` on ref or host + `href` set                                               | Never document-wide `a[href="…"]` or document-wide role/text when the locator must identify a **specific instance** — use `{region}` prefix from exploration (`.claude/skills/anaconda-playwright-utils/references/locators.md` § Tile and card navigation links) |
| No `testId` on ref or host                                                            | Tiers 2–6 (`data-*`, `#id`, `[name]`, stable CSS/XPath)                                                                                                                                                                                                           |
| All above exhausted                                                                   | Tier 7 (`getLocatorByRole`, …) — region-scoped when duplicates possible; add plan `**Locator note:**`                                                                                                                                                             |

#### Component host (`onHost: true`, interactive ref)

Chain from host test id to inner control — works for visibility, fill, and click:

```typescript
private readonly searchInput = () =>
  getLocatorByTestId('search-input').locator('input[role="combobox"]');
```

| Ref tag / role                  | Inner chain                                                         |
| ------------------------------- | ------------------------------------------------------------------- |
| `role: combobox`                | `.locator('input[role="combobox"]')`                                |
| `role: textbox`                 | `.locator('input[role="textbox"], textarea[role="textbox"]')`       |
| `INPUT` / `TEXTAREA` / `SELECT` | `.locator('input')` / `.locator('textarea')` / `.locator('select')` |

Record `**Locator scope:**` on the plan when this pattern applies.

**Do not** keep CLI `getByRole` when core output has `onHost: true` and a `testId`.

### Step 3 — Verify composed selector (one template)

After you compose a locator from Step 2, confirm it resolves to exactly **one** element:

```bash
playwright-cli eval "document.querySelectorAll('<your-compound-selector>').length"
# => 1  → proceed
# => 0  → selector wrong or ancestor does not contain target; revise
# => >1 → tighten selector (add region, structural compound, or ancestor)
```

Examples:

```bash
playwright-cli eval "document.querySelectorAll('[data-qa-id=item-list] [data-qa-id=item-alpha]').length"
playwright-cli eval "document.querySelectorAll('a:has([data-qa-id=item-alpha])').length"
playwright-cli eval "document.querySelectorAll('footer [data-qa-id=nav-item-alpha]').length"
```

Run Step 3 on **every selector you intend to ship** — including bare tier 2–6 selectors (`[data-testid="…"]`, `#id`, `[name="…"]`), which get no `dupCount` from core output (for tier 1, core `dupCount` already gives the count). Role-based anchors (`getLocatorByRole('contentinfo')…`) have no `querySelectorAll` form — verify with the equivalent landmark element selector (`footer`, `nav`, `main`); the shipped role anchor must target the same landmark element you verified. The full spec run happens in the generator's Compile & Verify gate — Step 3 is the lightweight CLI check during exploration.

## Batch discovery (regions with many test ids)

When planning or generating tests for a footer, form, list, or **homogeneous item grid**, map all `data-qa-id` values under a container ref in one call — then still apply Step 1 + anchor priority **per planned target** (each channel card, each package card, each footer link with its own case):

```bash
playwright-cli eval "el => [...el.querySelectorAll('[data-qa-id]')].map(n => ({ tag: n.tagName, id: n.getAttribute('data-qa-id'), text: n.textContent?.trim().slice(0, 40) }))" e203
```

Batch output is **inventory**, not a substitute for per-item anchor decisions. If the batch lists `item-a`, `item-b`, `item-c` on inner headings, plan anchor priority for **each** — do not scope `item-a` with `:has()` and template `item-b`/`item-c` to tier-7 role. See `.claude/agents/references/planner-anti-patterns.md` § Representative scoping anti-pattern.

Use the output to write locators — not `getLocatorByRole()` from CLI auto-generated code.

## Duplicate test-id scoping (when core `dupCount > 1`)

When Step 1 returns `dupCount > 1`, do **not** use bare `getLocatorByTestId('testId')` for visibility **or** actions. Apply **anchor priority** — use the same **anchor** for every step on that target (for priority 3, keep one wrapper selector and chain `.locator('[data-qa-id="target"]')` for inner-node assertions). Record `**Locator scope:**` on the plan case.

| Priority                          | When                                                                                    | Pattern                                                                                                                                                                     |
| --------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Test-id ancestor**           | Parent test id is a true container (containment check passes)                           | `getLocatorByTestId('parent').locator('[data-qa-id="target"]')`                                                                                                             |
| **2. Landmark or region**         | Verified landmark or CSS region contains target once                                    | `getLocatorByRole('contentinfo').locator('[data-qa-id="target"]')` or `getLocator('{region}').locator('[data-qa-id="target"]')`                                             |
| **3. Structural parent compound** | Target id on descendant; core eval `href` on wrapping `<a>`; priorities 1–2 unavailable | Visibility: `getLocator('a:has([data-qa-id="target"])').locator('[data-qa-id="target"]')`. Click: `a:has([data-qa-id="target"])` or `{region} a:has([data-qa-id="target"])` |

This is the compact form of the canonical anchor-priority table — the full version, with per-priority visibility/click targets, is in `.claude/agents/references/planner-anti-patterns.md` § Duplicate test-id detection. Keep the two in sync.

Anchor priority is not `data-qa-id`-specific: the same 1 → 2 → 3 order applies to **any duplicated stable attribute** (tier 2–4) — substitute `[data-testid="…"]` / `#id` / `[name="…"]` for `[data-qa-id="…"]` in the patterns and anchor with `getLocator()` instead of `getLocatorByTestId()`.

### Containment eval (only when proposing priority 1)

Candidate ancestors come from core-eval `ancestorId` or from the § Batch discovery inventory of the section container. Run **only after** you pick a candidate ancestor test id:

```bash
playwright-cli eval "Boolean(document.querySelector('[data-qa-id=section-c-heading]')?.querySelector('[data-qa-id=nav-item-alpha]'))"
playwright-cli eval "document.querySelector('[data-qa-id=section-c-heading]')?.tagName ?? null"
# => "H4" with containment false → heading/label, not a container; try priority 2 or 3
```

Then verify the scoped compound with Step 3:

```bash
playwright-cli eval "document.querySelectorAll('[data-qa-id=channel-list] [data-qa-id=channel-item]').length"
```

**Never** use `.first()` / `.nth()` / `.last()` when anchor priority can resolve to count = 1.

**Exhaustion order** — when no anchor reaches Step 3 count = 1 after priorities 1–3 (including a `{region}`-prefix retry on priority 3): first try region-scoped tier 7 with a plan `**Locator note:**`; only if tier 7 also cannot isolate the element, fall back to the tightest anchor + `.first()` with a comment — in that order.

See `.claude/agents/references/planner-anti-patterns.md` § Duplicate test-id detection for worked examples.

## Other attributes (when core returns no `testId`)

```bash
playwright-cli eval "el => el.id" e7
playwright-cli eval "el => el.getAttribute('data-testid')" e7   # tier 2
playwright-cli eval "el => el.getAttribute('aria-label')" e7
playwright-cli eval "el => getComputedStyle(el).display" e7
```

Tier 2–4 attributes get no `dupCount` from the core eval — count them before shipping (this is the Step 3 check for these tiers):

```bash
playwright-cli eval "document.querySelectorAll('[data-testid=\"x\"]').length"   # or '#id' / '[name=\"x\"]'
# => 1  → bare selector is safe
# => >1 → apply anchor priority (§ Duplicate test-id scoping) with the tier 2–4 selector substituted
```

`.nth()` / `.first()` / `.last()` are last resort only — see `.claude/skills/anaconda-playwright-utils/references/locators.md` § When Multiple Elements Match.
