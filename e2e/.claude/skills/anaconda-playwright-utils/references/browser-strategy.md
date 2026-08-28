# Browser Strategy: Optimizing Token Usage

## Three Tiers

### Tier 1: Snapshot (playwright-cli snapshot) — default for app exploration

- **Cost:** ~500-2000 tokens per snapshot
- **Use for:** Exploring any application page — accessibility-tree view with interactive element refs (e1, e15...), accurate for JS-rendered (SPA) content and dynamic UI state
- **Tool:** `playwright-cli open <url>` then `playwright-cli snapshot`
- **Optimization:** Each `playwright-cli` action (click, fill, etc.) returns an automatic snapshot. Only call `snapshot` explicitly when you need a fresh view without performing an action.

### Tier 2: Lite (WebFetch) — static pages only

- **Cost:** ~200-1000 tokens
- **Use for:** Known static or server-rendered content only — docs, marketing pages, or checking whether a URL exists or redirects
- **Tool:** `WebFetch` with the target URL
- **Limitation:** Fetches raw HTML without executing JavaScript. On SPAs (React/Vue/Next) it returns a near-empty shell (`<div id="root">`, `<div id="app">`, `<div id="__next">`) — the real UI never appears. Do not use it to explore application functionality.

### Tier 3: Full Browser (playwright-cli actions)

- **Cost:** ~50-200 tokens per action (requires an open browser)
- **Use for:** Selector capture — clicking, filling, navigating to verify real behavior and capture generated Playwright code
- **Required for:** All test code generation and selector verification

## Decision Rules

1. **Snapshot-first for applications.** For any app under test, go straight to `playwright-cli open <url>` + `snapshot`. It is accurate on SPAs and cheap enough for exploration.
2. **WebFetch only for static content.** Reach for `WebFetch` only when the target is known static content, or you just need to confirm a URL resolves.
3. **Never retry a shell.** If `WebFetch` returns a near-empty SPA shell, switch to the browser immediately — do not re-fetch the same site.
4. **Stay in browser once open.** Once you've opened the browser for a site, continue with `playwright-cli`. Don't switch back to `WebFetch`.
5. **Minimize snapshots.** Use the automatic snapshot returned after each action. Call `playwright-cli snapshot` only when you need to re-inspect without acting.

## User Overrides

Users can control the strategy with natural language:

| User says                                               | Effect                                                            |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| "use lite mode" / "save tokens" / "quick exploration"   | Prefer `WebFetch` where content is static; browser only if needed |
| "use browser mode" / "use full browser" / "be thorough" | Use `playwright-cli` for everything (skip WebFetch)               |
| _(nothing — default)_                                   | Agents pick the right tier automatically per phase                |

## Per-Agent Defaults

| Agent         | Default Start                 | Rationale                                                                               |
| ------------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| **Planner**   | Tier 1 (Snapshot)             | Apps under test are usually JS-rendered; the snapshot gives accurate structure cheaply  |
| **Generator** | Tier 3 (Full)                 | Must capture real selectors; browser always required                                    |
| **Healer**    | Error analysis, then Snapshot | Read the failure and test source before any browser; snapshot to verify the current DOM |

Only the planner has the `WebFetch` tool. Tier 2 (Lite) therefore applies to the planner only — the generator and healer do all live-page work through `playwright-cli`.
