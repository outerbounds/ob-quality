---
description: Reconcile AI setup updates with a safe two-pass anaconda-pw-setup workflow. Pass 1 keeps your edits and refreshes unedited files; the kept/untracked AI files are staged as a recovery baseline; pass 2 overwrites them to upstream; each overridden file is then merged three-way (upstream base + restored project facts from the profile) and left unstaged for review. Project-agnostic — all project specifics come from .claude/reconcile-ai-profile.json.
argument-hint: '[full|reconcile-only|prepare-only|report] [--no-stage] [--no-overwrite]'
allowed-tools: Read, Grep, Glob, Edit, Write, Bash(npx anaconda-pw-setup:*), Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git show:*), Bash(git rev-parse:*), Bash(git ls-files:*), Bash(git log:*), Bash(node:*), Bash(date:*), Bash(mkdir:*), Bash(rg:*), Bash(./node_modules/.bin/prettier:*), Bash(npx prettier:*)
model: sonnet
version: 1.17.1
---

Reconcile AI file updates installed by `@anaconda/playwright-utils` (the `npx anaconda-pw-setup` AI files: `CLAUDE.md`, `AGENTS.md`, `.claude/**`, `.cursor/rules/**`).

`anaconda-pw-setup` forces a choice: keep your edits (and miss upstream improvements) or overwrite them (and lose your project customizations). This command takes **both** — upstream improvements land, project facts are restored on top — with a git-staged recovery snapshot so an overwrite can never silently destroy your work.

> **Portable command.** Nothing here is hardcoded to one repo. Every project specific (canonical facts, path classifications, preserve rules) is read from `.claude/reconcile-ai-profile.json`. This command ships with the package and installs via `anaconda-pw-setup`; to enable fact-restoration in a repo, drop a filled-in `.claude/reconcile-ai-profile.json` beside it (template under `templates/examples/reconcile-kit/`). With no profile it still runs safely on a built-in default scope — it just restores nothing automatically and leaves all merge decisions to you (see section 0).

## Mental model — the safe two-pass workflow

1. **Pass 1 (keep-local):** `npx anaconda-pw-setup --keep-local` refreshes files you never edited, keeps every file you _did_ edit untouched, and prints the merge to-do list. It never prompts, so it is safe unattended. Never use bare `npx anaconda-pw-setup` here — it prompts on edited files and an agent cannot answer the prompt.
2. **Stage the baseline:** `git add` every in-scope AI file that shows a working-tree change after pass 1 (dirty `M` or untracked `??`). The staged index is both the **approved local baseline** (the local side of each three-way merge) and the **recovery snapshot** taken before the destructive overwrite. Clean committed files need no staging — HEAD is already their baseline, recoverable with `git show :./<path>`.
3. **Pass 2 (overwrite):** `npx anaconda-pw-setup --overwrite-all` replaces the in-scope AI files in the working tree with the pure upstream version. Now `git diff` shows exactly what upstream changes and `git show :./<path>` recovers your baseline.
4. **Reconcile:** for each overridden file, merge three-way — upstream base (version bumps, new sections, new guidance, new allowlists) plus restored project facts/edits from the staged/HEAD baseline and the profile. Leave the result **unstaged**.
5. **History:** write a run log so the next upgrade is a quick diff review, not a fresh investigation.

> **Why staging is mandatory before overwrite.** `--overwrite-all` is destructive. A committed-clean file is safe (HEAD is its baseline). But a file with uncommitted edits, or an untracked file, has its only copy in the working tree — overwrite erases it with nothing to merge against. Staging puts that content in the git index, which overwrite does not touch. **The overwrite pass must never run while any in-scope file still has uncaptured working-tree content** (see the completeness gate in section 4), or you assert the baseline in `reconcile-only`.

Invoking this command in `full` / default, `prepare-only`, or `--no-overwrite` mode is explicit permission to run `git add` **only** for the in-scope baseline files in step 3 (dirty and untracked AI files). `report` and `--no-stage` never stage. It is **not** permission to `git add .`, to stage non-AI files, to stage reconciled conflict files, to unstage anything, or to commit, restore, checkout, stash, tag, or reset.

## Modes

Parse `$ARGUMENTS`:

| Token            | Meaning                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| empty / `full`   | Run the complete workflow: pass 1, stage baseline, pass 2 overwrite, reconcile, history, report.                                         |
| `prepare-only`   | Run section 0, pass 1, and stage the baseline. Stop before the overwrite pass.                                                           |
| `reconcile-only` | Run section 0 (load facts), then assume the baseline is already staged and the overwrite already ran. Skip to section 5.                 |
| `report`         | Run section 0, then read-only: analyze staged vs unstaged state and print what would happen. No setup, no staging, no edits, no history. |
| `--no-stage`     | Do not run `git add`. Print the baseline files that would be staged, then **stop** — the overwrite pass is refused without a baseline.   |
| `--no-overwrite` | Run pass 1 and stage the baseline, but do not overwrite. Equivalent to `prepare-only`.                                                   |

Unknown tokens are an error: print this mode table and stop.

## 0. Load project facts first (profile-driven)

Run this section first in **every** mode (including `reconcile-only` and `report`). Read in order:

1. `.claude/reconcile-ai-profile.json` — the source of all project specifics.
2. `tsconfig.json` (if present) — source of truth for path aliases.
3. The `projectSkill.path` named in the profile, if any.

Use the profile's `canonicalFacts`, `projectOwnedPaths`, `projectFacingAiFiles`, `libraryOwnedAiFiles`, `preserveRules`, `forbiddenProjectFacingReplacements`, and `verification` throughout — do not hardcode them. If a `canonicalFacts` value conflicts with `tsconfig.json`, trust `tsconfig.json`, report the drift, and continue.

**No-profile degradation.** If `.claude/reconcile-ai-profile.json` is absent, run the same safe two-pass workflow in conservative mode, using this built-in default in place of the missing profile:

- **Default in-scope set** (used by sections 1, 3, 4): `CLAUDE.md`, `AGENTS.md`, `.claude/skills/**`, `.claude/agents/**`, `.claude/commands/*.md`, `.cursor/rules/*.mdc`.
- **Default classification** (used by section 6): treat every candidate as project-facing with **local-wins on overlap** — keep the baseline version wherever the baseline and upstream changed the same line/section, and apply only independent upstream additions. Print the upstream hunk for every overlap so you can hand-integrate it.
- **Forbidden-replacement scan** (section 7): skipped — there are no `bad`/`good` values to scan for. State this in the report.
- Restore **no** project-specific facts automatically (there are none), and recommend the user create a profile — copy the template shipped with the package at `templates/examples/reconcile-kit/reconcile-ai-profile.template.json` (in a consumer repo: `node_modules/@anaconda/playwright-utils/templates/examples/reconcile-kit/reconcile-ai-profile.template.json`) to `.claude/reconcile-ai-profile.json` — so future runs auto-restore their facts.

## 1. Preflight

Skip the setup-specific preflight in `reconcile-only` (but still run section 0). Run these (each as its own Bash call):

```bash
git rev-parse --show-toplevel
```

```bash
git rev-parse --show-prefix
```

```bash
git status --short
```

Preflight rules:

- **Subdirectory awareness.** If the AI files live in a subdirectory of the git repo, `git rev-parse --show-prefix` is non-empty. Pathspecs for `git add` / `git diff -- <path>` are cwd-relative and work as written. But `git show` / `git rev-parse` object refs are not cwd-relative: always use `git show :./<path>` for the index and `git show HEAD:./<path>` for HEAD. A bare `git show :<path>` resolves against the repo root and fails from a subdirectory. (When the AI files are at the repo root, `prefix` is empty and `:./<path>` still works.)
- Run from the directory that contains the AI files. If elsewhere, report it and adjust paths.
- If `git status --short` shows unstaged **non-AI** files before pass 1, stop and ask the user to clean or stage them first.
- **Record the pre-run dirty set.** Note which in-scope AI files are dirty-unstaged (` M`) or untracked (`??`) now. Step 3 must stage every one of them; the section-4 completeness gate verifies that before overwriting.
- Pre-existing **staged** files are user-managed: never unstage them; never restage them except when they are also in-scope baseline files in step 3.

**In-scope AI paths** = the union of the profile's `projectFacingAiFiles` and `libraryOwnedAiFiles` (or the built-in default set above when there is no profile). Do not add files the package does not ship — e.g. `package.json`, `package-lock.json`, or project docs — to the overwrite scope; the overwrite pass never touches them and they must not enter the recovery snapshot. Files in `projectOwnedPaths` are not package-shipped either: never overwritten, never candidates; they matter only for classification in section 6.

## 2. Pass 1 — keep-local

Skip in `reconcile-only` and `report` modes.

```bash
npx anaconda-pw-setup --keep-local
```

Then:

```bash
git status --short
```

Classify against the in-scope AI paths:

- **Auto-refreshed files** — setup updated them because you never edited them (now upstream-current).
- **Kept-local files** — setup left them because they have local edits. These need reconciling.
- **Deliberate-deletion reappearances** — if pass 1 re-creates a file you deleted on purpose, that is not a reconcile target (see Caveats). Note it and exclude it from staging.

## 3. Stage the baseline (recovery snapshot)

Skip in `reconcile-only` and `report` modes.

The baseline is **every in-scope AI file that currently shows a working-tree change** — dirty (` M`) or untracked (`??`). Clean committed files are skipped: HEAD is their baseline.

If mode includes `--no-stage`, print and **stop** (overwrite is unsafe without a staged baseline):

```text
Would stage baseline (recovery snapshot) before overwrite:
  <path>
  ...
Overwrite pass refused: run without --no-stage so the baseline can be captured first.
```

Otherwise stage exactly the baseline files (cwd-relative pathspecs, never `git add .`):

```bash
git add <baseline-file-1> <baseline-file-2> ...
```

```bash
git diff --cached --stat
```

If an in-scope file already had a distinct staged snapshot plus further unstaged edits (`MM`) before this run, `git add` replaces that earlier staged snapshot with the current worktree content as the baseline. The worktree is preserved; the intermediate staged version is not — report it.

If no in-scope file shows a working-tree change, print `No baseline files to stage; nothing to reconcile.` and stop.

If mode is `prepare-only` or includes `--no-overwrite`, stop here.

## 4. Pass 2 — overwrite

Skip in `reconcile-only`, `prepare-only`, `report` modes, and whenever `--no-stage` was set.

**Completeness gate (data-loss guard).** Before overwriting, re-run `git status --short` over the in-scope paths and confirm the baseline is complete. After step 3 every dirty/untracked in-scope file should read `M ` or `A ` (staged, clean worktree). If any in-scope file still shows a working-tree-side change — ` M`, `??`, or the second column of `MM`/`AM` — that step 3 did not stage, step 3 missed it, and overwriting now would destroy uncaptured content. **Stop and report; do not overwrite** until the baseline is complete. Do not run this section unless step 3 staged the baseline this run.

**Exception:** an in-scope `??` file that section 2 flagged as a deliberate-deletion reappearance does **not** trip the gate — it is a freshly reinstalled package file with no uncaptured user content. Leave it untouched and note it for the user to re-delete after the run.

```bash
npx anaconda-pw-setup --overwrite-all
```

```bash
git status --short
```

**Reconcile candidates** are every in-scope AI file whose working tree now differs from its baseline — i.e. `git diff -- <path>` is non-empty. The classification is uniform, and every candidate has a valid local baseline at `git show :./<path>`:

- ` M` — a clean-committed customized file (not staged in step 3); `git show :./<path>` returns the index, which equals HEAD, which is your committed version. **Reconcile it** — these are exactly the customizations to merge.
- `MM` — edited before the run and staged in step 3; `git show :./<path>` returns your staged edits.
- `AM` — previously untracked and staged in step 3; `git show :./<path>` returns your staged content.

A file showing only `M ` (staged, no worktree diff) was auto-refreshed and needs no reconciliation. There is no "unprepared" skip after overwrite — uncaptured files are caught by the completeness gate before the overwrite.

## 5. Build the three-way view

For each candidate (note the `:./` and `HEAD:./` forms):

```bash
git diff --cached -- <path>
```

```bash
git diff -- <path>
```

```bash
git show :./<path>
```

Also `Read` the working-tree file.

| Source                   | Meaning                                                       |
| ------------------------ | ------------------------------------------------------------- |
| `git show HEAD:./<path>` | Historical baseline before this run. Context only.            |
| `git show :./<path>`     | Approved local/safe baseline. The local side of the merge.    |
| working tree             | Pure upstream overwrite. The package side of the merge.       |
| profile + tsconfig       | Project facts. They win over both documents where they apply. |

## 6. Reconcile rules

Classify each candidate by the profile's path lists (or the no-profile default: all project-facing, local-wins), then apply the matching rule.

### Project-facing docs and commands (`projectFacingAiFiles`)

Base = upstream working tree; reapply approved local/project facts from the staged/HEAD baseline and the profile:

- Keep upstream version bumps, new sections, new warnings, new tool allowlists, general guidance.
- Restore the profile's `canonicalFacts` and real project examples over generic package examples.
- If upstream and local both changed the same sentence/row and both are plausible, keep local for project-specific facts and print the upstream hunk in the report.
- Honor `forbiddenProjectFacingReplacements`: never let a generic placeholder overwrite the project's real value unless the text is explicitly contrasting the generic default against the real one.

### Library-owned AI files (`libraryOwnedAiFiles`)

Base = upstream working tree; restore only intentional local additions present in the staged baseline:

- Keep package version bumps and upstream guidance.
- Reapply project routing/corrections only when the staged copy had them and they are still true per the profile.
- Do not turn generic library docs into project-only docs.

### Project-owned files (`projectOwnedPaths`)

Local-owned and not package files, so they should not appear as candidates. If one does, prefer the staged/local copy; apply upstream only if obviously mechanical and non-conflicting; otherwise report `kept local`.

## 7. Write and verify each reconciled file

**In `report` mode, do not write any file** — print the intended merge decision for each candidate and stop. (Sections 5–6 are read-only analysis and may run in `report` mode for preview.) In every other mode, state the intended merge decision in one sentence, then write. After each write:

```bash
git diff -- <path>
```

For project-facing files, scan for forbidden replacements using the profile's `forbiddenProjectFacingReplacements`. Build the `rg` alternation from each entry's `bad`: escape the value as a regex literal, add boundaries where needed so a bad value like `@fixture` does not match the correct `@fixturesetup`, and sort longer values before shorter overlapping values such as `tests/fixtures/fixture.ts` before `tests/fixtures/fixture`. With no profile, skip this scan.

```bash
rg -n "<escaped-bad-1>|<escaped-bad-2>" <path>
```

For markdown, run the project's formatter on only the touched files (use the profile's `verification.formatWriteCommand` if present):

```bash
./node_modules/.bin/prettier --write <touched markdown files>
```

Whitespace check:

```bash
git diff --check -- <path>
```

If a step fails, stop and report the file. Do not stage the reconciled result.

## 8. History log

Skip in `report` mode.

```bash
date +%Y%m%d-%H%M%S
```

```bash
mkdir -p <historyDirectory from profile, default .claude/reconcile-ai-history>
```

Write `<historyDirectory>/<timestamp>.md` containing: package version (`node -e "console.log(require('@anaconda/playwright-utils/package.json').version)"`), mode and setup commands, baseline staged, reconcile candidates, per-file decisions, project facts restored, verification results, files left unstaged, and any completeness-gate abort or deletion notes. Do not stage it.

## 9. Final report

```text
# /reconcile-ai-updates
Mode: <mode>   Package: @anaconda/playwright-utils@<version>

## Baseline staged (recovery snapshot)
<list or none>

## Reconciled conflict files left unstaged
<list or none>

## Kept local / skipped / deletion-reappearance
<list with reason>

## Project facts restored
<short bullets, or "none (no profile)">

## History
<history file path, unless report mode>

## Verification
<commands and pass/fail>

Review:
  git diff --cached   # the staged baseline / recovery snapshot
  git diff            # the reconciled overrides to accept or adjust
```

End by reminding the user: the baseline is staged as the recovery snapshot, reconciled files are intentionally unstaged, and they should review and stage results manually.

> **Commit-time footgun — say this explicitly.** The reconciled merges live in the working tree; the index holds the pre-update baseline. A bare `git commit` would commit the **baseline** and silently drop both the upstream update and your reconciliation. **`git add` the reconciled files before committing** (or `git commit -a` after reviewing the diff) so the merge — not the recovery snapshot — is what lands.

## Caveats

- **Run once per upgrade.** Each run assumes a baseline captured this run. Use `report` to re-inspect safely, or `reconcile-only` after a fresh baseline + overwrite.
- **Deliberate deletions can reappear.** Setup may reinstall a file you deleted on purpose (the help says it "installs missing files"; whether `--keep-local` treats an intentionally-deleted file as missing-to-reinstall or as a deletion to respect is not confirmed — verify against package behavior). This command does not auto-detect intentional deletions — re-delete after the run and note it.
- **Subdirectory paths.** Always use `git show :./<path>`; a bare `:<path>` resolves at the repo root and fails from a subdirectory.

## Hard rules

- Never run `git add .`. Stage only the in-scope baseline files in step 3.
- Never run the overwrite pass while any in-scope file still has uncaptured working-tree content (completeness gate), or without a staged baseline (or a `reconcile-only` assertion).
- Never run `git commit`, `git push`, `git tag`, `git stash`, `git restore`, `git checkout`, `git reset`, or any branch-mutating command.
- Never unstage files. Never stage reconciled conflict files.
- Never delete package-installed commands as part of this command.
- When project facts conflict with package-generic docs, the profile + tsconfig win.
- When uncertain, keep the staged/local version and print the upstream hunk for manual review.
