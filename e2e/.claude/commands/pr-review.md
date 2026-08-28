---
description: Review pending Playwright QA changes, a branch, or a PR against this project's QA standards (CLAUDE.md + qa-automation-quality guidelines) before pushing. Use when asked to review test code changes or do a pre-push review.
argument-hint: '[pr-number [post]] | [base-ref] [-- <note>] — empty reviews local work vs the default branch'
allowed-tools: Read, Grep, Glob, Bash(git status:*), Bash(git branch:*), Bash(git log:*), Bash(git diff:*), Bash(git show:*), Bash(git ls-files:*), Bash(git merge-base:*), Bash(git rev-parse:*), Bash(git symbolic-ref:*), Bash(git fetch:*), Bash(gh pr view:*), Bash(gh pr diff:*), Bash(gh pr comment:*)
model: sonnet
version: 1.17.1
---

Review the pending change set against this project's QA standards and report severity-ranked findings in chat. This command is **read-only** — never commit, push, stage, edit, or auto-fix anything, and never post to GitHub except in explicit `post` mode. (Installed into `.claude/commands/` by `npx anaconda-pw-setup`; the master copy lives in `templates/commands/` of `@anaconda/playwright-utils`.)

## Scope from $ARGUMENTS

- **Optional note** — if `$ARGUMENTS` contains a standalone `--`, treat
  everything after it as reviewer guidance only. Do not treat note text as a PR
  number or base ref, and do not narrow the required scope because of the note.
  Split on `--` before applying the mode rules below; apply **Empty**,
  **All digits**, and **Anything else** only to the trimmed text before `--`.
  `/pr-review -- <note>` is empty/local mode with reviewer guidance.
  Examples: `/pr-review -- second pass: focus on locator changes`;
  `/pr-review 93 -- re-check stale review comments`.
- **Empty** — local mode: review everything not yet on the default branch — commits ahead of the merge-base, plus staged, unstaged, and untracked work.
- **All digits**, optionally followed by the literal keyword `post` — PR mode: review that PR via `gh`. `post` without a PR number is an error — print usage and stop.
- **Anything else** — base-ref mode: verify it resolves with `git rev-parse --verify --quiet "<base-ref>^{commit}"`; if it does not resolve, print usage and stop. Review the merge-base of HEAD and that ref through the working tree.

If there is nothing to review — no commits ahead of the base and no staged, unstaged, **or untracked** changes — say so and stop.

## 1. Load the rubric

Read these in order; they are the review rules — never re-derive QA standards from memory:

1. Root `CLAUDE.md` — POM rules, 9-tier locator priority, assertion and import rules, commands.
2. `.claude/skills/qa-automation-quality/references/qa-automation-guidelines.md` — manual review checklist, `test.skip`/TODO rules, secrets and test-data policy, duplication guidance.
3. `.claude/skills/anaconda-playwright-utils/references/locators.md` — when locator-tier judgment calls come up.
4. `.claude/skills/playwright-cli/references/element-attributes.md` — the `dupCount`/`onHost` core-eval decision table the Locators row below checks against.

If the guidelines file is missing (check with `Read`, not a shell test), fall back to `CLAUDE.md` alone; if root `CLAUDE.md` is missing too, review with whichever rubric files exist. In either case recommend re-running `npx anaconda-pw-setup` (full run, no flags) to restore the missing files.

## 2. Gather the diff (stat first)

Detect the default branch, then gather the shape of the diff. Run these as
separate Bash tool calls; do not combine them with `&&`, `||`, shell variables,
command substitution, redirects, pipes, or subshells. Reuse the printed SHA as
`<BASE>` in later commands.

Local mode and base-ref mode only — skip this block entirely in PR mode and go
straight to "PR mode" below; local branch and working-tree state are unrelated
to a PR's diff.

```bash
git branch --show-current
```

```bash
git status --short
```

```bash
git symbolic-ref --quiet --short refs/remotes/origin/HEAD
```

For local mode, if the `git symbolic-ref` command prints a default branch such
as `origin/main`, run:

```bash
git merge-base HEAD "<default-ref>"
```

If it prints nothing or fails, run:

```bash
git merge-base HEAD origin/main
```

If that fails or prints nothing, run:

```bash
git merge-base HEAD origin/master
```

If that also fails, run:

```bash
git rev-parse HEAD
```

In base-ref mode, skip default-branch detection and run:

```bash
git merge-base HEAD "<base-ref>"
```

Use the first successful SHA as `<BASE>`, then run these as separate Bash tool
calls:

```bash
git log --oneline "<BASE>"..HEAD
```

```bash
git diff "<BASE>" --stat
```

```bash
git ls-files --others --exclude-standard
```

The `--stat` is the shape; pull content with a deletions-excluded diff, scoping to test paths when the stat flags noise:

```bash
git diff "<BASE>" --diff-filter=d
```

```bash
git diff "<BASE>" --diff-filter=d -- tests/ playwright.config.ts package.json
```

- **Untracked files** that are part of the change — `Read` each relevant one (skip binaries, reports, vendored).
- **Deletions** — judge from the `--stat` line; peek with `git show <BASE>:<path>` only for a small, high-signal removal.
- **Lockfiles, reports, and generated output** — judge from the stat line unless the change is hand-sized.

PR mode:

```bash
gh pr view "<PR>" --json number,title,body,baseRefName,headRefName,headRefOid,state,additions,deletions,changedFiles
```

```bash
gh pr diff "<PR>" --name-only
```

```bash
gh pr diff "<PR>"
```

The local checkout may not be the PR head. If `git rev-parse HEAD` differs from `headRefOid`, fetch the head read-only and verify file claims against it — never check it out:

```bash
git fetch origin "pull/<PR>/head"
git show FETCH_HEAD:<path>                 # ground-truth content at the PR head
```

## 3. Review every changed file

Apply the full QA rubric to QA paths (`tests/**`, `playwright.config.ts`, the QA `package.json`); give other changed files a light correctness pass and say so in Coverage. Review every category for every file — do not stop at the first finding.

| Category             | What to check (canonical source)                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Locators             | 9-tier priority respected; core eval workflow (`element-attributes.md` § Step 1–3) before writing locators; duplicated `data-qa-id` scoped via `dupCount`; component-host chains when `onHost: true`; tile/card links never bare document-wide `a[href="…"]`; `.nth()`/`.first()`/`.last()` only as documented last resort with a comment (CLAUDE.md + locators reference) |
| POM structure        | Specs call only page object methods; action methods (interactions only) vs `verify*` (assertions only) vs `get*` naming; no bundled `navigateTo*` mixing `clickAndNavigate` with `expectPage*`; new page objects registered in `tests/fixtures/fixture.ts` (CLAUDE.md)                                                                                                     |
| Fixtures and imports | `test` from `@fixture`; one barrel import from `@anaconda/playwright-utils`; path aliases, not `../../`; no raw Playwright API (CLAUDE.md)                                                                                                                                                                                                                                 |
| Assertions           | Message argument on every `expect*`; soft assertions flushed with `assertAllSoftAssertions(test.info())` after each method that uses them                                                                                                                                                                                                                                  |
| test.skip / TODO     | `test.skip()` justified with a comment; every TODO references a ticket (guidelines)                                                                                                                                                                                                                                                                                        |
| Test data & secrets  | Data in `tests/testdata/` only; no hardcoded credentials or tokens (guidelines)                                                                                                                                                                                                                                                                                            |
| Duplication          | No parallel flows or copied helpers under different names (guidelines)                                                                                                                                                                                                                                                                                                     |
| Structure            | `test.describe` with `@smoke`/`@reg` tags; `beforeEach` for shared setup; lowercase-hyphen filenames; no `console.log` (use `logger` in page objects only)                                                                                                                                                                                                                 |

Automated gates are out of scope here — never run the file-writing npm scripts listed under Hard rules (they rewrite files via lint-staged and `--fix`). If the project wires those scripts, remind the user to run `npm run precommit` from the QA install root themselves. This command covers the semantic review the gates cannot.

## 4. Report (chat output)

Use exactly this structure:

```
## /pr-review — <scope, e.g. "local work vs the default branch (3 commits, 14 files, 2 untracked)">

### Findings (ranked)

| #   | Severity | Confidence | Category | Location  | Finding            |
| --- | -------- | ---------- | -------- | --------- | ------------------ |
| 1   | major    | high       | locators | file:line | one-line statement |

Severity (critical | major | minor | info) and confidence (high | medium | low) labels as defined below.

### Detail

Per finding: the claim, the rubric rule it violates, the evidence, the suggested fix.

### Coverage

| Category             | Result                |
| -------------------- | --------------------- |
| Locators             | 1 finding             |
| POM structure        | no findings — checked |
| (every category)     | …                     |

Files with no findings: <file>, <file> — explicit all-clear, never silent omission.

### Verdict

One line — finding counts by severity, or exactly:
✅ All checks passed — no issues found across the applicable categories.
```

Report **every** finding with its severity (`critical | major | minor | info`) and confidence (`high | medium | low`), including minor and low-confidence ones — never self-filter to "important" findings; the reader filters the ranked list.

## Posting (explicit opt-in only)

Only when `$ARGUMENTS` contained both a PR number and the literal keyword `post` — post the Findings table and Verdict as **one** comment: `gh pr comment "<PR>" --body "<body>"`. Never post in local or base-ref mode, never post without the keyword.

## Hard rules

- Never run `git add`, `git commit`, `git push`, `git tag`, `git stash`, `git restore`, `git checkout`, `gh pr checkout`, or any file write — the working tree must be byte-identical after the run.
- Never run file-writing npm scripts (`format`, `lint:fix`, `quality:full`, `quality:report`, `precommit`).
