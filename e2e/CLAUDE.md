# Playwright TypeScript Project

## Prerequisites

The Playwright agents (planner / generator / healer) shell out to `playwright-cli` for live browser interaction. It must be **globally installed** on each developer machine that uses browser exploration — run `npx anaconda-pw-setup` to install or verify it, or install manually: `npm install -g @playwright/cli@0.1.14`. Re-run setup after upgrading `@anaconda/playwright-utils` to check for a newer recommended version. API-only planning, generation, and healing skip `playwright-cli` entirely.

## Load This First (AI Assistants)

> Before writing test code, load `.claude/skills/anaconda-playwright-utils/SKILL.md` — all 115 library functions, import patterns, CLI-to-library mappings, and an example test. Load a specific `references/*.md` only when you need option types or worked examples for that module (see "When to Load a Reference" at the end of SKILL.md).

## Project Structure

```
<project>/
├── playwright.config.ts          # Playwright configuration
├── tests/
│   ├── test-plans/               # Markdown test plans (planner output; not *.spec.ts)
│   ├── specs/
│   │   ├── ui/                   # UI test spec files (*.spec.ts)
│   │   └── api/                  # API test spec files (*.spec.ts)
│   ├── pages/
│   │   ├── ui/                   # UI Page Object classes
│   │   └── api/                  # API classes
│   ├── fixtures/
│   │   └── fixture.ts            # Custom fixtures for page objects
│   ├── testdata/
│   │   ├── ui/                   # UI test data
│   │   └── api/                  # API test data
│   └── storage-setup/            # Auth storage state setup
├── .claude/
│   ├── skills/
│   │   ├── anaconda-playwright-utils/  # Library API docs + references
│   │   ├── api-test-automation/        # Reusable Playwright TypeScript API automation guidance and templates
│   │   ├── playwright-cli/             # Browser automation CLI
│   │   └── qa-automation-quality/      # Quality gates workflow
│   ├── agents/                         # Planner, generator, healer
│   └── commands/                       # /pr-review, /refactor-tests, /reconcile-ai-updates, /commit-msg, /raise-pr, /install-sesame
├── .kilo/
│   ├── agents/                         # Same three agents, generated for Kilo (kilo.ai) — never hand-edited
│   ├── commands/                       # Same slash commands, generated for Kilo — never hand-edited
│   ├── instructions/
│   │   └── agent-routing.md            # Forces planner/generator/healer requests through task, never inline
│   └── kilo.jsonc                      # Wires Kilo to the .claude/ skills, CLAUDE.md, and agent-routing.md; created only if absent
```

## Imports and Setup

### Path Aliases (tsconfig.json)

| Alias                | Resolves to                            |
| -------------------- | -------------------------------------- |
| `@pages/*`           | `tests/pages/*`                        |
| `@testdata/*`        | `tests/testdata/*`                     |
| `@fixture`           | `tests/fixtures/fixture` (single file) |
| `@playwright-config` | `playwright.config`                    |

### Singleton Page Pattern

Always import `test` from `@fixture`, never from `@playwright/test`. The fixture calls `setPage(page)` before every test — all library functions use this singleton internally. If `setPage` is not called, all library calls fail.

### Import Convention

One barrel import from `@anaconda/playwright-utils` for all utilities and constants. ESLint enforces sorted named imports. Example import block: `.claude/skills/anaconda-playwright-utils/SKILL.md` § Import Patterns.

### Config Files (project root)

- `playwright.config.ts` — spread `AnacondaConfigDefaults` and `AnacondaProjectDefaults` from `@anaconda/playwright-utils`
- `tsconfig.json` — strict mode, path aliases above
- `eslint.config.mjs` — extends `@anaconda/playwright-utils/eslint` (flat config; `.mjs` so the ESM `export default` works regardless of `package.json` `type`)

## Page Object Model (3-File Pattern)

Every test uses three files: a **Page Object** class, a **Fixture** registration, and a **Spec** file. All actions and assertions live in the page object — specs only call page object methods.

Full 3-file code example — page object (static string vs arrow-function locator fields), fixture registration, and spec: `.claude/skills/anaconda-playwright-utils/SKILL.md` § Example Test. That is the canonical example — do not restate it here.

### POM Rules

- **Spec files contain only page object method calls** — no `fill()`, `click()`, `expect*()`, or raw `expect()` in specs
- **Page objects own all actions and assertions** — action methods (verb+noun) contain **interactions only** (no `verify*` calls, no inline `expect*`); `verify*` methods contain **assertions only**; specs orchestrate action then verify. For click→navigate URL checks, use separate `click*` + `verify*` methods — never bundle `clickAndNavigate` with `expectPage*` in one method. `gotoURL`-only setup methods (`navigateToLoginPage`, `navigateToHomepage`) are fine.
- **Default layout by layer** — UI page objects in `tests/pages/ui/` (imported via `@pages/ui/`), API classes in `tests/pages/api/` (`@pages/api/`), specs in `tests/specs/ui/` / `tests/specs/api/`, test data in `tests/testdata/ui/` / `tests/testdata/api/`. Preserve an existing project's layout rather than moving its files.
- **Register every new page object or API class** in `tests/fixtures/fixture.ts` before using it in specs
- **Wrap all tests** in a `test.describe` block with tags (`@smoke`, `@reg`)
- **Use `test.beforeEach`** for shared setup (navigation, login)
- **Store test data** in the matching `tests/testdata/ui/` or `tests/testdata/api/` folder — never hardcode values in page objects or specs

## Rules

### Library Usage

- **Always use `@anaconda/playwright-utils` functions** — never raw Playwright API (`page.click()`, `page.fill()`, `page.goto()`, `expect(locator)`)
- **`clickAndNavigate()`** for clicks that trigger page navigation; **`click()`** for same-page/AJAX actions
- **`fill()`** for inputs; **`pressSequentially()`** only for auto-search/autocomplete fields
- **Alert helpers** (`acceptAlert`, `dismissAlert`, `getAlertText`) click the trigger and wait for the dialog; `options.timeout` bounds both the trigger click and dialog wait, and trigger click failures are rethrown unchanged
- **Never add `waitForPageLoadState` after `clickAndNavigate`** — it already waits internally

### Assertions

- **Every assertion must include a descriptive error message** as the last argument
- **Hard assertions** (default) for critical checks; **soft assertions** (`{ soft: true }`) for non-critical — call `assertAllSoftAssertions(test.info())` immediately after each page object method that uses soft assertions

### Locators

- **Discover attributes before writing locators** — accessibility snapshots often omit `data-qa-id`. Run the **core eval** in `.claude/skills/playwright-cli/references/element-attributes.md` § Step 1, apply § Step 2 rules, then **verify** with § Step 3 — do not copy CLI `getByRole` output when core output supports tier 1–6.
- **Use `getLocatorByTestId()`** for `data-qa-id` for a **single standalone element** — never raw CSS `[data-qa-id="..."]` for a single element. Scope with one ancestor by chaining — `getLocatorByTestId('parent').locator('[data-qa-id="child"]')`; use a CSS compound string when there are two or more ancestors or mixed attribute types (see `.claude/skills/anaconda-playwright-utils/references/locators.md`). (`getLocatorByTestId()` targets the configured `testIdAttribute` — Anaconda projects set `use.testIdAttribute = 'data-qa-id'` in `playwright.config.ts`; any other `data-*` attribute must use a CSS selector instead.)
- **Component-host test id** — when `data-qa-id` is on a wrapper and the snapshot ref is the inner input, chain to the inner control (e.g. `getLocatorByTestId('search-input').locator('input[role="combobox"]')`) for visibility, fill, and click — never bare `getLocatorByTestId` on the host alone.
- **Tile/card links** — never document-wide `a[href="…"]` alone; scope to the feature region or use tier-1 `:has([data-qa-id="…"])` compounds (see `.claude/skills/anaconda-playwright-utils/references/locators.md` § Tile and card navigation links).
- **Always upgrade locators** — if a DOM snapshot reveals a `data-qa-id` or `data-*` attribute, use it instead of role/text locators
- **`.nth()` / `.first()` / `.last()` are last resort only** — prefer ancestor scoping; add a comment if you must use one (see `.claude/skills/anaconda-playwright-utils/references/locators.md`)

### Code Quality

- **No `console.log`** — use `logger` from `@anaconda/playwright-utils` in page objects only, never in specs
- **Import `test` from `@fixture`** — never from `@playwright/test` (see § Singleton Page Pattern)

## Locator Priority (9-Tier)

1. `data-qa-id` attributes (best) -> `getLocatorByTestId()` (`use.testIdAttribute = 'data-qa-id'` is configured in Anaconda projects)
2. Other `data-*` attributes (e.g. `data-testid`, `data-test`) -> CSS selector `[data-testid="..."]`
3. `id` attributes -> `#id`
4. `name` attributes -> `[name="..."]`
5. XPath with unique attributes -> `//button[@aria-label="Submit"]`
6. CSS with unique attributes -> `button[aria-label="Submit"]`
7. Playwright built-in (only when no stable selector) -> `getLocatorByRole()`, `getLocatorByLabel()`, `getLocatorByText()`
8. XPath structural (fragile) -> `//div[@class="form"][2]//button`
9. CSS structural (last resort) -> `.form-group:nth-child(2) button`

Full guide with scoping patterns: `.claude/skills/anaconda-playwright-utils/references/locators.md`

## Commands

```bash
npx playwright test                              # Run all tests
npx playwright test <spec-file>                  # Run specific file
npx playwright test --grep @smoke                # Run by tag
npx playwright test -g 'login'                   # Run by pattern
npx playwright test --project=chromium           # Run on specific browser
npx playwright test <spec-file> -j 3 --retries 2 # Parallel workers + retries
npx playwright test --ui                         # Open UI mode (interactive runner)
npx playwright show-report                       # View HTML report
```

### Optional quality scripts (when defined in `package.json`)

Some projects (including library maintenance repos that mirror `@anaconda/playwright-utils` tooling) define:

| Script                       | Consumer wires (bin)                             | Purpose                                                                                                           |
| ---------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `format`, `lint`, `lint:fix` | Your Prettier/ESLint commands (not from package) | Required by `quality:full` / `quality:report`                                                                     |
| `check:code-quality`         | `playwright-utils-check-code-quality`            | Code-quality from install root                                                                                    |
| `check:code-quality:staged`  | `playwright-utils-check-code-quality --staged`   | Optional: staged QA paths only                                                                                    |
| `quality:full`               | `playwright-utils-quality-full`                  | Full-repo compact gate; needs `format`, `lint:fix`, `lint`                                                        |
| `quality:report`             | `playwright-utils-full-quality-report`           | Full-repo report [1]–[4]; [4] `manual-review/secrets` skips `tests/testdata/**/*.ts`; exit **0**/**1** on [1]–[3] |
| `precommit`                  | `playwright-utils-precommit`                     | QA-scoped Husky hook; do not split into lint-staged + commit-quality-report                                       |
| (ad-hoc)                     | `playwright-utils-print-manual-review-hint`      | Optional manual hints; [4] is already in `quality:report`                                                         |

**Consumers:** wire bins as above—do not use `bash ./scripts/*.sh` in your `package.json`. **Maintainers of `@anaconda/playwright-utils` itself** use `bash ./scripts/*.sh` in that repo (own bins are not in `node_modules/.bin/` at the package root). See README § Code quality checks.

If your project does not list these scripts, ignore this table. When the **qa-automation-quality** skill is installed, see its `references/qa-automation-guidelines.md` for detail.

The `format` script is yours to define, but the package ships its own Prettier config if you want the same style the library and its templates are written in (120-column, single quotes, trailing commas): `prettier --config node_modules/@anaconda/playwright-utils/.prettierrc --write .`. Copy it to your own `.prettierrc` instead if you'd rather pin the style than track the package's.

### Prettier-safe markdown patterns

If your project defines a `format` script that runs Prettier over `**/*.md` (see the optional scripts table above), most markdown does not need special handling. If formatting introduces escaped `\*` characters or other visible backslash artifacts in edited lines, fix only the affected pattern:

```text
# BAD: glob inside bold+backtick — Prettier escapes the inner *
**`path/**/*.ts`**

# GOOD: plain backticks only
`path/**/*.ts`
```

```text
# If this exact shape gets escaped
**text**:

# Safe rewrite
**text:**
```

Do not rewrite normal colon labels, inline bold emphasis, or whole sections to em dashes just for formatting. Leave them alone unless the formatter actually creates escaped markdown.

After editing any `.md` file, run your `format` script (or `npx prettier --check <file>.md`) and verify the file is unchanged.

## Skills and Agents

Installed and refreshed by `npx anaconda-pw-setup`:

- **Select groups:** `--skills`, `--agents`, `--commands`, `--docs` — or exclude with `--skip-skills` / `--skip-agents` / `--skip-commands` / `--skip-docs` (skip and group selectors cannot be mixed).
- **Keep just your `CLAUDE.md`** while still refreshing the `AGENTS.md` pointer: `--skip-claude-md` (e.g. `--overwrite-all --skip-claude-md`).
- **Keep files with local edits** and get the merge to-do list: `--keep-local`.
- **Overwrite:** `--overwrite-all` for everything in the selected groups, or per-group `--overwrite-skills` / `--overwrite-agents` / `--overwrite-commands` / `--overwrite-docs`.
- **CLI check:** `--install-cli` or `--skip-cli-check` (the two cannot be combined). By itself, `--install-cli` only checks or installs the global `playwright-cli` — combine it with a setup flag when you also want AI files processed.

Setup installs what is missing, skips identical files, and silently updates files you never edited (your copy is verified against the shipped hashes of every released version — no edits means nothing to lose). Only files with real local edits raise the one overwrite question — Enter keeps your edits (reconcile the package updates with `/reconcile-ai-updates`, or by hand, or take them later with an `--overwrite-*` flag); overwriting is always an explicit choice (answer `y`, or use an `--overwrite-*` flag for a single category).

The `--agents` group installs **both** agent trees (`.claude/agents/` and `.kilo/agents/`) together, plus `.kilo/instructions/agent-routing.md` — there is no separate selector for either Kilo path. Setup seeds `.kilo/kilo.jsonc` only once `.claude/skills/`, `CLAUDE.md`, and the routing rule are all on disk (this run or an earlier one), so any order of targeted `--skills`, `--docs`, and `--agents` runs works; a full run installs all three together. If a Kilo config already exists anywhere in the project (`kilo.jsonc`, `kilo.json`, `.kilo/kilo.jsonc`, or `.kilo/kilo.json`), it is never edited. A config that already contains all three required paths needs no action; an incomplete or invalid config gets a format-appropriate JSON or JSONC snippet with the missing keys plus an end-of-run to-do.

The `--commands` group installs **both** command trees (`.claude/commands/` and `.kilo/commands/`) together — there is no separate selector for the Kilo path. Kilo discovers `.kilo/commands/*.md` automatically by directory convention; no `kilo.jsonc` wiring is needed for commands the way skills need `skills.paths`.

### Skills (`.claude/skills/`)

| Skill                                                                     | When to load                                                                          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `.claude/skills/anaconda-playwright-utils/SKILL.md`                       | **Always first** — all 115 functions, imports, CLI mapping                            |
| `.claude/skills/anaconda-playwright-utils/references/actions.md`          | Click, fill, select, drag, upload, keyboard, alerts                                   |
| `.claude/skills/anaconda-playwright-utils/references/assertions.md`       | All `expect*` assertion functions                                                     |
| `.claude/skills/anaconda-playwright-utils/references/locators.md`         | Locator strategy, 9-tier priority, frames                                             |
| `.claude/skills/anaconda-playwright-utils/references/element-utils.md`    | Element data retrieval, state checks, waits                                           |
| `.claude/skills/anaconda-playwright-utils/references/api-utils.md`        | API/HTTP request testing                                                              |
| `.claude/skills/anaconda-playwright-utils/references/page-utils.md`       | Navigation, multi-tab, page state                                                     |
| `.claude/skills/anaconda-playwright-utils/references/browser-strategy.md` | Token-efficient page exploration (Snapshot/Lite/Full)                                 |
| `.claude/skills/api-test-automation/SKILL.md`                             | Reusable guidance, references, and templates for Playwright TypeScript API automation |
| `.claude/skills/playwright-cli/SKILL.md`                                  | Live browser interaction for selector capture                                         |
| `.claude/skills/qa-automation-quality/SKILL.md`                           | Quality gates — before commit/PR, lint failures, "run all checks"                     |

**Your project skill (optional, repo-owned).** Beyond the bundled skills above, you can add a project skill at `.claude/skills/<your-project>/` (a router `SKILL.md` + `references/`) encoding this repo's navigation, auth, feature flags, known locators, and planning context. `anaconda-pw-setup` never creates or overwrites it — it is yours. The planner, generator, and healer discover it automatically **by exclusion** (any skill directory that is not `anaconda-playwright-utils`, `api-test-automation`, `playwright-cli`, or `qa-automation-quality`), load it first, and follow its routing. Present → the agents are faster and repo-accurate; absent → they degrade cleanly to "none found".

### Agents (`.claude/agents/`, `.kilo/agents/`)

Each agent preloads its bundled skills via `skills:` frontmatter in Claude Code — the full SKILL.md content is injected into the agent's context at startup (the planner loads `anaconda-playwright-utils` + `api-test-automation` + `playwright-cli`; the generator and healer additionally load `qa-automation-quality`).

| Agent                       | Purpose                                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `playwright-test-planner`   | Surveys existing coverage, explores the app, and writes a right-sized test plan (updates existing plans)                      |
| `playwright-test-generator` | Generates test code (UI page object or API class + fixture + spec) from a plan — spawns the planner first when no plan exists |
| `playwright-test-healer`    | Debugs and fixes failing UI and API tests — live browser inspection for UI, request/response evidence for API                 |

**Workflow:** Plan -> Generate -> Heal (the generator spawns the planner itself when invoked with no plan)

The planner drives routing: every plan case carries a **Disposition** — `new-spec` (new file), `new-case in <spec>` (add a `test()` to an existing file), or `extend "<test() title>" in <spec>` (add to an existing `test()`) — and the generator obeys it. Every new plan case also declares **Test type:** `UI` or `API`. The shared planner assesses coverage at each layer; API cases hand off endpoint, contract source, authentication, request, response, and setup/cleanup details. The generator honors the type (inferring it for older plans), and the healer investigates API failures through request/response evidence.

All three agents ship twice: as the Claude files above, and as generated Kilo files under `.kilo/agents/` (`templates/kilo/agents/` in the package — regenerated from `templates/agents/` by `scripts/build-kilo-templates.js`, never hand-edited). See **Runtime support** below for what differs between the two.

`.kilo/instructions/agent-routing.md` ships alongside the Kilo agents (wired into `.kilo/kilo.jsonc`'s `instructions` array) — a routing table that forces a Kilo main session to delegate "generate tests" / "plan tests" / "fix failing tests" phrasing to the matching agent above via `task`, with explicit no-exceptions language, instead of doing the work inline. Claude Code has no equivalent gap, so this file is Kilo-only.

### Runtime support

- **Claude Code** — the files above load as documented: skills preload via each agent's `skills:` frontmatter, and the subagent-spawn tool is `Task`/`Agent`.
- **Kilo (kilo.ai)** — reuses the `.claude/` skills and `CLAUDE.md` in place via `.kilo/kilo.jsonc`'s `skills.paths` / `instructions` keys (created only when no Kilo config exists yet — see the setup note below); `.claude/` is therefore **required** for Kilo users, not optional. Kilo discovers skills but loads a skill's body only on demand via the `skill` tool — there is no preload equivalent to Claude Code's `skills:` — so each Kilo agent's first action is loading its bundled skills explicitly before any other tool call. The subagent-spawn tool is `task` (lowercase — Kilo's tool names are all lowercase, unlike Claude Code's `Task`/`Agent`). `.kilo/instructions/agent-routing.md` (also wired into `instructions`) maps generate/plan/heal phrasing to the required agent — without it a Kilo main session can (and has) handled planner/generator/healer work inline instead of delegating via `task`.
- **Commands** ship twice, same pattern as agents: `.claude/commands/*.md` for Claude Code, and generated `.kilo/commands/*.md` for Kilo (`templates/kilo/commands/` in the package — regenerated from `templates/commands/` by `scripts/build-kilo-commands.js`, never hand-edited). Kilo commands drop Claude-only `argument-hint` and `allowed-tools` (no equivalent — Kilo has no per-command tool-scoping) and `model` (Claude's short aliases like `sonnet` are not valid Kilo provider/model ids; the command inherits the session model instead). `/install-sesame` registers its MCP server per-assistant: `claude mcp add` on Claude Code, a `claude_desktop_config.json` merge on Claude Desktop, and an `mcp` key entry in `kilo.jsonc`/`kilo.json` on Kilo — Kilo has no CLI equivalent of `claude mcp add`, so the command writes a fresh Kilo config only when none exists, otherwise prints the entry to add by hand.

If skills or agent routing do not work in Kilo: run `kilo debug skill`, then `/reload` or start a new session. Run `kilo debug config` to inspect the resolved config assembled from all supported project locations (`kilo.json`, `kilo.jsonc`, `.kilo/kilo.json`, and `.kilo/kilo.jsonc`); verify it contains `.claude/skills` in `skills.paths` and both `CLAUDE.md` and `.kilo/instructions/agent-routing.md` in `instructions`.

### Commands (`.claude/commands/`, `.kilo/commands/`)

| Command                 | Usage                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/pr-review`            | Review pending changes, a branch, or a PR against this project's QA standards                                                                                             |
| `/refactor-tests`       | Triage existing tests/page objects toward repo standards — auto-applies safe mechanical fixes, proposes risky merges/splits; defaults to files changed since the last run |
| `/reconcile-ai-updates` | Reconcile edited AI files with upstream package updates (two-pass keep-local → overwrite → three-way merge), driven by `.claude/reconcile-ai-profile.json`                |
| `/commit-msg`           | Suggest a branch name and two commit subjects; copy the descriptive one to the clipboard                                                                                  |
| `/raise-pr`             | Generate a pre-filled GitHub PR URL (regular or draft), or update an existing PR's title and description                                                                  |
| `/install-sesame`       | Install and register the Sesame MCP server for your OS (Claude Code / Claude Desktop / Kilo)                                                                              |
