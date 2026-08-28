---
description: Suggest a branch name and generate a compact and a descriptive commit subject, copying the descriptive one to the clipboard.
argument-hint: '[staged|all]'
model: haiku
allowed-tools: Read, AskUserQuestion, Bash(git branch:*), Bash(git log:*), Bash(git status:*), Bash(git diff:*), Bash(git ls-files:*), Bash(osascript:*)
version: 1.17.1
---

Generate a branch suggestion and two commit subjects for the user to pick from and edit. Do NOT commit, push, or touch `package.json`, `package-lock.json`, or `CHANGELOG.md` — those belong to the release process.

## 1. Gather state

Run in one batch:

```bash
git branch --show-current
git log --oneline -10
git status --short
git diff --cached --stat
git diff --stat
git ls-files --others --exclude-standard
```

**Decide what to describe — read `git status --short` column characters directly:**

Each line is two characters + space + path. The **first column** is the staged state; the **second column** is the unstaged/untracked state.

- Any line with a non-space, non-`?` character in the **first column** (`M `, `A `, `MM`, etc.) → staged changes exist.
- Any line with a non-space character in the **second column** (`MM`, ` M`, etc.) → unstaged changes exist.
- Any line starting with `??` → untracked files exist.

Check `$ARGUMENTS` first (case-insensitive):

- `staged` → use staged changes only, skip asking.
- `all` → use everything (staged + unstaged + untracked), skip asking.
- No argument or unrecognised → apply the routing rules below.

Route in this order:

1. **Staged only** — staged changes exist, no unstaged changes, no untracked files → use staged. Proceed.
2. **Staged plus unstaged or untracked** — staged changes exist AND (unstaged changes exist OR untracked files exist) → use `AskUserQuestion` with the question "What should I describe?" and two options: `Staged changes only` and `Everything (staged + unstaged + untracked)`. Wait for the selection before continuing.
3. **Unstaged or untracked only** — no staged changes, but unstaged or untracked exist → use unstaged plus untracked. Note that nothing is staged.
4. **Nothing** — no staged, unstaged, or untracked changes → say so and stop.

Pull content only where it informs the message. **Never run a monolithic diff across all staged files** — large changesets overflow the tool output budget and get silently truncated. Instead:

- From the `--stat` output, identify which human-authored files need their content read (skip lockfiles, `dist/`, hash registries, and generated output — their stat line is self-explanatory).
- For each file that needs content, run `git diff --cached -- <path>` **one file at a time** (staged mode), or `git diff -- <path>` (unstaged mode). Read untracked files with the `Read` tool.
- Skip per-file diffs for files whose stat is self-explanatory (e.g. `scripts/known-file-hashes.json` — "hash updated"; `package-lock.json` — "lockfile bump").

## 2. Branch

Infer a `type/` prefix (`feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `release/`) from the changes — match the conventional-commit `type` you will use for the subject. Build a short kebab-case slug (~3–5 words) describing the dominant change.

Display using exactly one of these three cases (branch names wrapped in backtick-quotes in all output):

**Case 1 — on `main` or `master`:**

```
Current: `main`
Suggested: `<type>/<slug>`
> ⚠️ You are on `main` — create the suggested branch before committing.
```

**Case 2 — suggested equals current branch:**

```
Current: `<branch>`
```

Followed by: "Current branch looks good."

**Case 3 — suggested differs from current branch:**

```
Current: `<branch>`
Suggested: `<type>/<slug>`
```

## 3. Write the two subjects

### Subject quality rules (apply to both variants)

- Conventional commits: `type(scope): description`. Match `type`/`scope` vocabulary from recent `git log`.
- Imperative present tense, no trailing period.
- **Lead with the dominant change in plain, accurate words.** Say what actually changed and why it matters.
- **Only elevate a _substantial_ concern.** New capabilities, behaviour changes, and real reworks earn subject space. One-line edits, doc-list additions, wording tweaks, and follow-on hash/version refreshes do not — even if they sit in their own file.
- **Match the verb to what you actually did — never overstate.** Adding a doc line that mentions an existing command is "note `/raise-pr` in the CLAUDE.md list", not "register `/raise-pr`" — the latter implies you created or wired it up.
- Precise verbs only: `register`, `add`, `remove`, `rename`, `harden`, `fix`, `tighten`, `refresh`, `forbid`, `split`, `restructure`. **Banned** as the sole descriptor or as a tail: `update`, `improve`, `clarify`, `polish`, `finalize`, `various`, `misc`, `changes`, `tweaks`, and tails like "and more" / "etc." (Fine _inside_ a precise phrase — "update Node to 20" is OK; "improve tooling" is not.)

### Compact variant

≤72 characters. One dominant change, tight. Drop secondary concerns.

### Descriptive variant

Single line, up to ~150 characters. Lead with the dominant change, then fold in the one or two next-most-substantial concerns with commas / "and". Still imperative, no trailing period, **no body**. Minor items (doc-list additions, hash/version refreshes, wording tweaks) stay out. If there is genuinely one concern, the descriptive line may equal the compact one.

### Example pair

- Compact: `chore: rework /commit-msg to emit compact and descriptive subjects`
- Descriptive: `chore: rework /commit-msg to emit compact and descriptive subjects, auto-copy the descriptive one, and always suggest a branch`

## 4. Output

Show, in this exact order, and nothing else:

1. **Branch** — current and suggested branch display per the rules in §2.
2. **Simple** — the compact subject in a ` ```text ` block.
3. **Detailed** — the descriptive subject in a ` ```text ` block.
4. Auto-copy the **descriptive** subject to the macOS clipboard with one `osascript` Bash command. Escape any `\`, `"`, `$`, or backtick inside the argument:

   ```bash
   osascript -e 'on run argv' -e 'set the clipboard to item 1 of argv' -e 'end run' "<descriptive subject>"
   ```

   Do not use `Write`, heredocs, shell redirection, pipes, command substitution, temp files, or `pbcopy`; those forms either fail outside the project or trigger Claude Code's "cannot be statically analyzed" approval prompt.

5. If the Bash command succeeds, say: "Copied the descriptive message to clipboard — paste into VS Code source control and edit if you like." If it fails, say: "Automatic clipboard copy failed on this machine; copy the detailed block above."

Do **not** output a separate change-summary section, an explanation, or alternative candidate messages.
