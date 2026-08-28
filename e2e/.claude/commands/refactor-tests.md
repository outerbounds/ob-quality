---
description: Triage and refactor existing Playwright tests/page objects toward repo standards. Default triages only files changed since the last refactor run, auto-applies safe mechanical fixes, and proposes (never auto-executes) risky merges, duplicate removals, and oversized-test splits. Exits fast when nothing is stale since the last run; pass --force to re-triage anyway. Use for periodic conformance cleanup.
argument-hint: '[all | <file.ts|spec> | "<test/describe title>" | @tag … | <free text>] [dry-run|report|apply] [--force] — empty triages files changed since the last run; exits fast when nothing is stale'
allowed-tools: Task, Read, Grep, Glob, Edit, Write, Bash(node:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git ls-files:*), Bash(git rev-parse:*), Bash(git hash-object:*), Bash(git merge-base:*), Bash(git symbolic-ref:*), Bash(npm run check:code-quality:*), Bash(npm run lint:*), Bash(npm run lint:fix:*), Bash(npm run validate:*), Bash(npm run format:*), Bash(npm run generate-docs:*), Bash(grep:*), Bash(wc:*), Bash(find:*), Bash(tail:*)
model: sonnet
version: 1.17.1
---

Triage the in-scope Playwright files against this project's standards, then refactor. This command runs **mechanical triage first** (grep, line counts, and the read-only quality/lint scripts) to build a worklist before any file is read for reasoning — model file-reading fires only on flagged items. The **default mode** auto-applies safe mechanical conformance fixes and _proposes_ risky structural operations (merge, remove-duplicate, split) for per-item confirmation; it **never commits**. On a re-run where no in-scope file changed since the last run, it **exits immediately** with a "nothing to re-triage" line — a `--force` modifier re-triages regardless. It stays thin: it does not restate the locator tiers, the dedup criteria, or the heal loop — it points worker subagents at the agents/skills that own them. (Installed into `.claude/commands/` by `npx anaconda-pw-setup`; the master copy lives in `templates/commands/` of `@anaconda/playwright-utils`.)

## Scope and mode from $ARGUMENTS

Parse `$ARGUMENTS` as a whitespace-separated token list; quoted substrings stay one token. Classify each token first-match-wins:

| Order | Token shape                                                         | Meaning                                                                                                                                                                                                             |
| ----- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `help`, `--help`, `-h`, `?`                                         | print the usage block below and stop                                                                                                                                                                                |
| 2     | `dry-run`, `report`, or `apply` (case-insensitive)                  | **mode flag** — at most one; a second distinct flag is an error (usage + stop)                                                                                                                                      |
| 3     | `--force` (case-insensitive)                                        | **modifier** — ignore ledger freshness and re-triage every in-scope file; bypasses the fast-exit. Orthogonal to mode and target; removed from target resolution. Alone (no target) it widens scope to `all` (warn). |
| 4     | `all`                                                               | full-sweep target (exclusive — if combined with other targets, `all` wins; warn)                                                                                                                                    |
| 5     | starts with `@` (e.g. `@smoke`, `@reg`)                             | **tag** target (multiple tags union)                                                                                                                                                                                |
| 6     | quoted `"…"` / `'…'`                                                | **title** target                                                                                                                                                                                                    |
| 7     | ends `.spec.ts`, or a path under `tests/specs/`                     | **spec-file** target                                                                                                                                                                                                |
| 8     | ends `.ts`, or an existing path                                     | **TypeScript-file** target (page object / helper / fixture / testdata)                                                                                                                                              |
| 9     | unquoted token that resolves to exactly one `describe`/`test` title | **title** target                                                                                                                                                                                                    |
| 10    | anything else                                                       | **free-text** instruction                                                                                                                                                                                           |

- The mode flag and `--force` are orthogonal to targets and are removed from target resolution. Targets (except `all`) **union**; deduplicate the resulting file set. If `--force` is present with no target tokens, scope is `all` (warn).
- Free-text alone → scope = the default changed-set; apply the instruction there. Free-text with a co-present target → the instruction biases the refactor within that target's scope.
- Ambiguous title (token matches more than one block) → print the candidate `file:line` list and stop; ask the user to quote a more specific title or pass the spec file.
- A `*.ts`/path token that matches nothing → print usage and stop. Empty `$ARGUMENTS` with no `--force` → default mode, default scope, default behavior.

**Mode semantics:**

- `dry-run` / `report` — analyze only. Run triage, classify, print the report. Make no edits, run no file-writing scripts (`format`, `lint:fix`, `generate-docs`, `quality:*`, `precommit`), and write no ledger.
- _default_ (no flag) — auto-apply every `auto-fix-safe` item; _propose_ every `propose` item and apply it only after explicit per-item confirmation. Write the ledger.
- `apply` — same safe auto-fix, plus execute the risky items whose IDs were confirmed (one batched confirmation gate). Write the ledger. Still never commits.
- `--force` (modifier — combine with any mode) — treat every in-scope file as stale, so the fast-exit is skipped and even ledger-fresh files are re-triaged. Alone (no target) it widens the default scope to `all`. Changes nothing else: risky ops stay propose-only, and `report`/`dry-run` still write nothing.

**Fast exit (idempotent no-op).** After scope resolution, if no in-scope file is stale (section 1 freshness gate) and `--force` was not passed, print the no-op line and stop **before** any grep, worker, or script runs. This is the common re-run path — see section 1.

```text
/refactor-tests — triage & refactor Playwright tests toward repo standards.

USAGE
  /refactor-tests [TARGET …] [MODE] [--force]

TARGET (zero or more; unioned; default = files changed since the last refactor run)
  all                      Sweep the entire suite (overrides other targets).
  <name>.spec.ts | path    A spec → that spec + the page objects it uses + the fixture.
  <name>.ts | path         A page object / helper → that file + the specs that use it.
  @tag  [@tag …]           Specs/blocks carrying that tag annotation (e.g. @smoke @reg).
  "<title>"                A test()/describe() title → that block + its owning page objects.
  <free text>              A focused instruction, applied to the resolved (or changed) scope.

MODE (at most one; default = auto-fix safe, propose risky)
  dry-run | report         Analyze only. Build the worklist and report; change nothing.
  apply                    Auto-apply safe fixes AND, after one confirmation, the proposed risky ops.

MODIFIER
  --force                  Re-triage even files the ledger already marks refactored — skips the
                           fast exit. Combine with any mode; alone (no target) it targets `all`.

FAST EXIT (without --force)
  A run whose in-scope files are all unchanged since the last run stops immediately with a
  "nothing to re-triage" line — no greps, no workers, no scripts.

EXAMPLES
  /refactor-tests                         Triage only what changed since the last run.
  /refactor-tests all report              Full-suite analysis, no edits.
  /refactor-tests @smoke apply            Refactor smoke-tagged specs, safe + confirmed-risky.
  /refactor-tests login-page.ts           That page object + its specs (default behavior).
  /refactor-tests "Login with valid credentials"   Locate that test and refactor its scope.
  /refactor-tests @smoke --force          Re-triage every smoke spec, ignoring the ledger.

This command never commits. See "Hard rules".
```

## 1. Resolve scope and tooling (read-only)

Resolve the worklist file set per the target type:

| Target                           | Files into the worklist                                                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| empty / default                  | the changed-since-last-run set (section 3)                                                                      |
| `all`                            | `tests/specs/**/*.spec.ts`, `tests/pages/**/*.ts`, `tests/fixtures/fixture.ts`, `tests/testdata/**`             |
| `@tag`                           | specs/blocks whose title carries the tag (`grep -rnE "@<tag>\b" tests/specs/`) + the page objects they exercise |
| `"<title>"`                      | the owning spec + the page objects that block uses (+ its shared `beforeEach`)                                  |
| `<spec>.spec.ts`                 | that spec + the `@pages/*` page objects it imports + `tests/fixtures/fixture.ts`                                |
| `<page>.ts`                      | that file + every spec that uses it (`grep -rl`) + the fixture if it is registered there                        |
| `tests/testdata/*.ts` or fixture | the file + its importers (`grep -rl "@testdata/<name>"`)                                                        |

The file paths above are the generic library layout. If this repo uses a different fixture path or test categories, read `CLAUDE.md` / `tsconfig.json` for the actual paths and aliases and resolve against those instead.

Resolve the duplicate-method scanner and degrade gracefully if it is absent. Run as its own Bash call:

```bash
node -e "try{console.log(require('path').dirname(require.resolve('@anaconda/playwright-utils/package.json')))}catch{console.log('')}"
```

If that prints empty, the package is not resolvable — skip the script-backed dedup check (it is one input, not the whole track) and note it in the report.

**Freshness gate — compute the stale set, then fast-exit if it is empty.** Now that scope and the `standardsVersion` token are known, use the ledger (section 3) to decide which in-scope files actually need work: a file is **stale** if it has no ledger entry, its `git hash-object` differs, or its `standardsVersion` differs from the current token (see section 3 for the full freshness condition). `--force` marks every in-scope file stale (ledger ignored). **If the stale set is empty and `--force` was not passed, stop here** — run no section 2 greps, spawn no workers, run no script. Print only:

```text
✓ /refactor-tests — nothing to re-triage.
  No in-scope file changed since the last run (<lastRunCommit>); every one is still fresh
  for standards <standardsVersion> (last refactored <timestamp>).
  Re-run with --force to re-triage anyway.
```

Keep this line honest: it confirms that nothing changed and every in-scope file was previously cleared — it does **not** re-assert that the whole suite is dedup-clean, because Track B (section 5) is not re-run on this path. This is the common re-run path and must stay cheap: one scope resolution, the `require.resolve` call above, and one `git hash-object` per in-scope file.

Only past the gate (stale work exists, or `--force` was passed), `Read` (never a shell test) the optional context docs and continue if any are missing — this keeps the command working in projects that lack them: a generated coverage map if the project produces one (`docs/specs/*-OVERVIEW.md`, `docs/specs/*-ARCHITECTURE.md`), and the project skill's `references/known-locators.md` and `references/planning-context.md`. The **project skill** is any `.claude/skills/<name>/` whose name is not `anaconda-playwright-utils`, `playwright-cli`, or `qa-automation-quality` — see `.claude/skills/anaconda-playwright-utils/SKILL.md` § Project Skill Discovery. Absent any of these, proceed with the common skills alone.

## 2. Mechanical triage — build the worklist before reading any file for reasoning

Reached only when the section 1 freshness gate found stale work (or `--force` was passed). Run the cheap read-only checks below to produce worklist rows `{file, line, rule-id, category, disposition}`. Scope the `local-conformance` and `oversized-split` checks to the **stale set**; the two `global-dedup` checks always scan the full in-scope tree (see the note at the end of this section). Only open a file's body for reasoning once it appears on the worklist. Run each command as its own Bash tool call; never join with `&&`, pipes, redirects, or subshells. Do not trim command output with shell plumbing such as `2>&1 | tail -10`; let the tool return output normally and summarize the relevant lines afterward. Shell plumbing bypasses the command-specific allow rules and causes avoidable permission prompts.

- **category:** `local-conformance` (fixable within one file) | `global-dedup` (cross-file) | `oversized-split` (structural).
- **disposition:** `auto-fix-safe` (edit directly in non-report modes) | `propose` (confirmation required).

| Check                     | Pattern / tool (read-only)                                                                 | Flags                                                                                              | Category                            | Disposition                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Raw fixture import        | `grep -rnE "from '@playwright/test'"` over scope                                           | `test`/`expect` imported from `@playwright/test` instead of `@fixture`                             | local-conformance                   | propose (legit infra exceptions: `tests/storage-setup/` auth setup and API request classes — confirm each, never blind-fix) |
| Raw `page.*`              | Raw Playwright page grep command below                                                     | direct Playwright API instead of library wrappers                                                  | local-conformance                   | propose (wrapper substitution is semantic)                                                                                  |
| `console.*`               | Console grep command below                                                                 | console calls (specs: none; page objects: use `logger`)                                            | local-conformance                   | auto-fix-safe in page objects (→ `logger`); propose in specs (likely debug leftover)                                        |
| Raw `data-qa-id` CSS      | `grep -rnE "\[data-qa-id="`                                                                | hand-written CSS selector instead of `getLocatorByTestId`                                          | local-conformance                   | propose (locator-tier judgment)                                                                                             |
| XPath-string locators     | XPath grep command below                                                                   | XPath strings in raw string fields, not just `locator()` args                                      | local-conformance                   | propose                                                                                                                     |
| Missing assertion message | `grep -rnE "\bexpect[A-Za-z]+\("` then flag calls with no trailing message string          | `expect*` wrappers without a message argument                                                      | local-conformance                   | propose (the message text is author intent)                                                                                 |
| Hardcoded timeout literal | Timeout grep command below                                                                 | numeric timeout instead of a `*_TIMEOUT` constant                                                  | local-conformance                   | auto-fix-safe when it maps 1:1 to a known constant; else propose                                                            |
| Inline test data          | Inline test-data grep command below                                                        | test-data declared inline instead of in `tests/testdata/`                                          | local-conformance                   | propose                                                                                                                     |
| Oversized `test()`        | `grep -nE "\btest\("` for block starts, then `wc -l` / brace span per block                | a single `test()` body well over the suite's norm                                                  | oversized-split                     | propose                                                                                                                     |
| Duplicate test titles     | extract `test`/`describe` titles, `sort` + `uniq -d`; plus near-dup by normalized title    | identical or near-identical titles across files                                                    | global-dedup                        | propose                                                                                                                     |
| Duplicate methods         | `node <PKG_ROOT>/scripts/scan-duplicate-function-hints.js` over the **full in-scope tree** | duplicate function/method bodies (`manual-review/duplication`)                                     | global-dedup                        | propose (skip + note if `<PKG_ROOT>` empty)                                                                                 |
| Quality harvest           | `npm run check:code-quality` (read-only)                                                   | file-length, file-naming, `test.skip` without justification, TODO without ticket, JSDoc complexity | local-conformance / oversized-split | file-length & naming → propose; skip/TODO → propose; JSDoc → auto-fix-safe where mechanical                                 |
| Lint surface              | `npm run lint` (read-only — never `lint:fix` here)                                         | ESLint findings (sorted imports, alias violations, …)                                              | local-conformance                   | auto-fix-safe for the autofixable subset; propose otherwise                                                                 |

Alternation grep commands. For whole-suite triage, scope these to Playwright code locations; for a narrower target, replace the paths with the resolved in-scope file set:

```bash
grep -rnE "\bpage\.(click|fill|goto|locator|waitFor|getBy|press|check|selectOption|hover|setInputFiles)\b" tests test-setup playwright.config.ts
```

```bash
grep -rnE "console\.(log|debug|info|warn|error)\(" tests test-setup playwright.config.ts
```

```bash
grep -rnE "['\"\`](//|\.//|xpath=)" tests test-setup playwright.config.ts
```

```bash
grep -rnE "(timeout|waitFor[A-Za-z]*)\s*[:(]\s*[0-9]{3,}" tests test-setup playwright.config.ts
```

```bash
grep -rnE "\b(const|let)\s+\w*[Dd]ata\b" tests test-setup playwright.config.ts
```

**Critical — the two global-dedup checks scan the full in-scope tree, never the ledger-gated subset.** The duplicate scanner keeps a single global `seen` map and flags the _later_ occurrence, so a changed file that duplicates an _unchanged_ page object would be missed if only the changed set were scanned. Do not run `quality:report`, `quality:full`, or `precommit` — they are file-writing report pipelines.

## 3. The refactor ledger — `.claude/refactor-ledger.json`

The ledger makes re-runs cheap and idempotent. It is keyed on `(content-hash, standardsVersion)` so a standards bump invalidates every entry.

- `standardsVersion = "<command-frontmatter-version>+pw<installed-playwright-utils-version>"`. Resolve the package version via the section 1 `require.resolve` call; if it cannot be resolved, use the command version alone. Do not hash `CLAUDE.md` (it churns on doc edits and is absent in template installs).
- Schema:

```jsonc
{
  "schemaVersion": 1,
  "standardsVersion": "<command-frontmatter-version>+pw<installed-playwright-utils-version>",
  "lastRunCommit": "<sha>",
  "files": {
    "tests/pages/login-page.ts": {
      "hash": "<git hash-object output>",
      "lastRefactoredAt": "<ISO timestamp>",
      "standardsVersion": "<command-frontmatter-version>+pw<installed-playwright-utils-version>",
      "categoriesCleared": ["local-conformance"],
    },
  },
}
```

**Changed-since-last-run** (cheap pre-filter, then authoritative gate):

```bash
git diff --name-only <lastRunCommit> HEAD
```

```bash
git status --short
```

Intersect with `tests/` and fold in uncommitted/untracked files. Then for each in-scope file compute `git hash-object <file>` and compare to the ledger: a file is **stale** (re-triage) if it has no entry, the hash differs, or its `standardsVersion` differs from the current token; it is **fresh** (skip per-file local-conformance re-checks) only if hash and `standardsVersion` match and `categoriesCleared` covers what we would check. **`--force` overrides this** — it marks every in-scope file stale regardless of hash or `standardsVersion`, so the fast-exit is skipped and all files are re-triaged (the ledger is still rewritten in non-report modes).

**Caveat (do not violate):** the ledger gates **per-file local-conformance only**. Global-dedup and any merge/removal reasoning always run over the full in-scope tree regardless of per-file freshness — a cross-file duplicate can live between two files that are each individually unchanged. `report`/`dry-run` writes no ledger. If `.gitignore` does not ignore `.claude/`, the ledger is trackable; write it for the user to stage — never stage or commit it yourself. Write keys sorted to minimize merge churn.

## 4. Track A — local conformance (fan-out, the value driver)

Run Track A first. Normalizing locator style and method bodies before the dedup index makes structural-duplicate detection far more accurate. Spawn worker subagents with the **Task** tool.

1. **Shared-page-object pre-pass (sequential, one worker).** Pull commonly-imported page objects out of the fan-out — the `common-*` files and any page object the project skill's `known-locators.md` lists as used by multiple specs. One worker conforms them serially, so no two workers ever edit the same shared file.
2. **Per-spec fan-out (parallel — spawn N workers in a single message).** Each worker owns one spec plus its non-shared page object(s) (disjoint sets after the pre-pass). Brief each worker to:
   - Read `.claude/skills/anaconda-playwright-utils/SKILL.md` (function tables, CLI-to-Library map, constants) and `.claude/skills/anaconda-playwright-utils/references/locators.md` (9-tier priority, § Tile and card navigation links); read `.claude/skills/playwright-cli/references/element-attributes.md` § **Attribute Discovery Workflow** (canonical for planner, generator, healer); read the generator's **Locator and Code Quality Rules** and **Duplicate test-id detection (strict mode prevention)** sections in `.claude/agents/playwright-test-generator.md`; read `CLAUDE.md` POM rules.
   - Apply **only the `auto-fix-safe` categories** to **only its assigned files**. Run the generator's **Anti-hallucination self-check** (every `@anaconda/playwright-utils` name must appear in the SKILL.md function tables) before any edit. Do not touch test structure; do not merge, remove, or split anything — hand any cross-file smell to Track B.
   - Use the project's real aliases (from `CLAUDE.md` / `tsconfig.json`) — typically `@fixture` → `tests/fixtures/fixture`, plus `@pages/*`, `@testdata/*`, `@playwright-config`. Never invent an alias the project does not define, and never rewrite a working project alias to a different one.
   - Run `npm run format` on touched files as a standalone Bash call and return a structured per-file summary: `file`, `status` (edited | no-op), `categories_applied` (with line, before/after, cited rule), `verification`, `anti_hallucination_gate`, `deferred` (items punted to Track B). If an ESLint autofix is needed in non-report modes, run `npm run lint:fix` as its own standalone Bash call; never append `2>&1 | tail ...` or other output-trimming shell plumbing.
3. **Verify (orchestrator).** Lint and (where available) typecheck the touched files. The consumer script contract guarantees `lint`/`lint:fix`/`format`/`check:code-quality`, not a typecheck script — so detect one before relying on it: read `package.json` scripts (with `Read`, not a shell test) and run `npm run validate` (tsc) only if it exists; otherwise skip it and mark affected items **typecheck-unavailable (lint-verified only)** rather than claiming a typecheck ran. Always run `npm run lint`. Mechanical fixes are verified by typecheck (when available) + lint. A locator-tier change alters runtime behavior — re-run the affected spec where auth/feature-flags allow; if it is not runnable, mark the item **runtime-unverified (static checks only)** rather than claim a green run. If a conformance edit makes a _runnable_ spec fail, hand that spec to the **`playwright-test-healer`** subagent (its edit → re-run → cap-at-3 → `test.fixme` loop).

## 5. Track B — global dedup / merge / split (map-reduce, propose-only)

The orchestrator runs this after Track A lands, over the normalized tree. A per-file worker is blind to a duplicate in a sibling file, so this is map-reduce, not fan-out.

1. **Index (map).** Reuse the coverage map for titles/tags; `grep` page-object method signatures; escalate to AST body comparison only to confirm a cluster — do not write a new title extractor. If the project defines a coverage-map generator (e.g. `npm run generate-docs` writing `docs/specs/*-OVERVIEW.md`), it is **mode-gated:** in `report`/`dry-run` _read_ the existing map (note if stale or absent) and never run the generator; only in `default`/`apply` may you run it first to refresh. Projects without such a generator skip this and index from the specs directly.
2. **Cluster (reduce).** Group candidates into: exact-duplicate tests, mergeable same-root-cause tests, duplicate methods across page objects, and oversized tests to split. Apply the planner's **Gate 1 — Suite Budget + Candidate Ledger** criteria from `.claude/agents/playwright-test-planner.md` ("fails for the same root cause as a case you already kept → merge, don't duplicate" — **except** navigation links with different destination URLs, which are distinct failure modes; **except** the sole representative navigation case for a **route-template family** — do not merge chip/pill nav into a visibility-only test or delete it during dedup; do not treat a valid suite-level `**Scope justification:**` overage as merge fodder); use `.claude/agents/references/planner-anti-patterns.md` § Spec Organization, § Navigation & interaction testing, and § Page Object Method Granularity for merge/split shape (`**Combines:**`, `**Spec calls:**`).
3. **Structural-similarity guard.** Each merge/removal candidate carries discriminators (feature-flag cookie, user context, slug, testdata — read from the project skill's `planning-context.md` when present). **If any discriminator differs, auto-demote the candidate to "distinct — do not merge"** and show the differing one. This is why two specs that differ only by feature flag, user role, or data slug (e.g. a `premium` vs `regular` variant) are never auto-merged. Structurally similar is not the same as duplicate.
4. **Propose-then-confirm.** Emit one proposal per item:

```text
[G-07] MERGE-CANDIDATE   risk: HIGH   status: AWAITS CONFIRMATION
  type:    mergeable same-root-cause tests
  members: <spec path>:34  "displays product metadata"
           <spec path>:61  "shows product price"
  rule:    planner Gate 1 "same root cause → merge, don't duplicate" + § Spec Organization
  discriminators: flag=none/none  user=standardUser/standardUser  testdata=same  → SAME (merge allowed)
  action:  collapse into one test() — **Combines:** metadata + price; **Spec calls:** verifyProductMetadata(), verifyProductPrice()
  before/after sketch: <shown>
  approve? [y / n / edit]

[G-12] DISTINCT — NOT A DUPLICATE   status: AUTO-DEMOTED (no action)
  members: checkout-regular.spec.ts  vs  checkout-premium.spec.ts
  discriminators: flag=none vs premium-checkout  slug differs  → DIFFER → do not merge
```

A **removal** proposal additionally shows a `grep` usage check proving no other spec/page object references the symbol (the healer's before-delete discipline). A **split** proposal shows the proposed per-`test()` boundaries and the new `verify*` method names. In `default` mode prompt per `[G-nn]`/`[S-nn]`; in `apply` mode apply only the IDs the user pre-authorized. Confirmed merges/splits are authored by the **`playwright-test-generator`** subagent (fed the merged plan fragment); a broken run after applying routes to the healer.

## 6. Report (printed on every run except the fast-exit no-op path; the whole output for `dry-run`)

```text
# /refactor-tests — Findings Report
Run mode: <default|dry-run|apply>   Branch: <branch> (NOT committed)
Worklist: <n> items  (local <a> / global <b> / split <c>)

## A. Local conformance (safe, mechanical) — grouped by category
  <file:line> | <rule, cited to doc> | <action> | <risk> | <applied?> | <verification>

## B. Global dedup / merge — one line per [G-nn], including AUTO-DEMOTED "distinct" items

## C. Oversized split — one line per [S-nn]

## D. Ledger update — conformant / no-op (already conformant) / failed

## E. Skipped / deferred — auth-gated runtime-unverified, removals blocked by live references,
     non-@smoke areas missing from the coverage map, script-backed checks skipped (package absent)
```

Cite every line to its owning doc — `CLAUDE.md` (POM, locator tiers, imports), `.claude/skills/anaconda-playwright-utils/references/locators.md` (tier), the generator's **Locator and Code Quality Rules**, the planner's **Gate 1**. Risk: LOW (mechanical) / MED (method dedup, split) / HIGH (test merge or removal).

## Hard rules

- Never run `git add`, `git commit`, `git push`, `git tag`, `git stash`, `git restore`, `git checkout`, or branch. Edit the working tree in non-report modes and leave it dirty for the user to review and commit.
- Never run `quality:report`, `quality:full`, or `precommit` — they are file-writing report pipelines. Triage uses only read-only scripts — `check:code-quality`, `lint`, and (where the project defines it) `validate`.
- `format`, `lint:fix`, and `generate-docs` run **only** in `default`/`apply` modes — never in `dry-run`/`report`.
- Risky ops (merge, remove-duplicate, split) are propose-only in `default` and confirmation-gated in `apply` — never silent. Structurally similar is not duplicate (apply the discriminator guard).
- The ledger gates per-file conformance only; global-dedup always scans the full in-scope tree and is never short-circuited by per-file freshness.
- The fast-exit path (empty stale set, no `--force`) prints the honest "nothing to re-triage" line and stops before any triage — no greps, no workers, no scripts, no ledger write. Never widen it into a "suite is fully conformant / dedup-clean" claim; Track B is not re-run there.
- `--force` **additionally** re-triages files the ledger marks fresh — on top of the stale ones (and, with no target, it widens scope to `all`); it changes nothing else — risky ops stay propose-only, `report`/`dry-run` still write nothing, and it never commits.
- Degrade gracefully when repo-specific files or scripts are absent — detect with `Read`/`require.resolve`, not a shell test, and continue with reduced context so the command works in projects that lack them.
- `report`/`dry-run` writes nothing — no edits, no file-writing scripts, no ledger.
