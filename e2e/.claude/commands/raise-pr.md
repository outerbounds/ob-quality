---
description: Generate a pre-filled GitHub PR URL (regular or draft-ready), or update an existing PR's title and description
argument-hint: '[draft|update [pr-url]]'
model: sonnet
allowed-tools: Bash(git branch:*), Bash(git symbolic-ref:*), Bash(git remote:*), Bash(git status:*), Bash(git merge-base:*), Bash(git log:*), Bash(git diff:*), Bash(node:*), Bash(gh auth status:*), Bash(gh pr view:*), Bash(gh pr edit:*)
version: 1.17.1
---

Generate a pre-filled GitHub compare URL so the user can review the title and description, edit if needed, and click **Create pull request** themselves. In `update` mode, regenerate and apply both the title and description to the PR it finds for the current branch. Do NOT run `gh pr create`, create a draft PR, commit, push, or modify any repository file. Default/draft mode must output a pre-filled page link plus the generated title and description for review; no PR exists until the user clicks GitHub's final create button. Update mode may modify only the existing PR's title and description via `gh pr edit`.

## Steps

### 0. Choose mode

Read `$ARGUMENTS` case-insensitively:

- No argument -> **create mode**.
- `draft` -> **draft create mode**.
- `update` -> **update mode**.
- `update <full-pr-url>` -> **update mode** for that explicit PR URL.

If both `draft` and `update` are present, stop and say to choose either `draft` or `update`, not both.

### 1. Guard: refuse to create from the default branch

Before doing anything else, determine the current branch and the repository's
default branch. Run these as separate Bash tool calls:

```bash
git branch --show-current
```

```bash
git symbolic-ref --quiet --short refs/remotes/origin/HEAD
```

The `git symbolic-ref` output is the default branch as `origin/<name>` (e.g.
`origin/main`); strip the `origin/` prefix to get `<DEFAULT_BRANCH>`. If it
prints nothing or fails (origin/HEAD is not set locally), fall back to
`<DEFAULT_BRANCH>` = `main` — preserving the historical default. Reuse the
resolved `<DEFAULT_BRANCH>` in every later create/draft step.

If the current branch equals `<DEFAULT_BRANCH>` and this is create or draft create mode, **stop immediately** and say exactly this, with the resolved default branch substituted for `<DEFAULT_BRANCH>` (no URL, no further steps):

> Hey, you're on `<DEFAULT_BRANCH>` — you can't raise a PR from here. Create a feature or release branch, move your changes onto it, then run `/raise-pr` again. Let me know what you'd like to call the branch and I'll help you get set up.

Do not proceed past this step if the current branch is the default branch in create or draft create mode.

### 2. Resolve update target

Only in update mode, resolve the PR before gathering the diff. Run these as
separate Bash tool calls:

1. `gh auth status`
2. `git branch --show-current`

If no PR URL was provided after `update`, run:

```bash
gh pr view --json number,url,title,body,headRefName,baseRefName
```

If a PR URL was provided after `update`, run:

```bash
gh pr view "<pr-url>" --json number,url,title,body,headRefName,baseRefName
```

Do not run both `gh pr view` commands.

If `gh pr view` fails, stop and say no open PR was found for the current branch; include this hint: `Pass the PR URL explicitly: /raise-pr update https://github.com/<owner>/<repo>/pull/<number>`.

If the resolved PR `headRefName` does not match the current branch, stop and say this command drafts the update from the local branch diff, so the user should switch to the PR branch or pass the PR URL while on its branch.

For update mode, use the resolved PR `url` as the update target and its
resolved `baseRefName` as the base branch. For create and draft create mode,
use `<DEFAULT_BRANCH>` (resolved in step 1) as the base branch.

### 3. Gather state

Run these discovery commands as **separate Bash tool calls**. Do not combine
them with `&&`, `;`, shell variables, redirects, pipes, command substitution, or
subshells — those compound shell forms trigger Claude Code's "cannot be
statically analyzed" approval prompt.

1. `git branch --show-current`
2. `git remote get-url origin`
3. `git status -sb`
4. `git merge-base HEAD origin/<DEFAULT_BRANCH>`
5. `git merge-base HEAD <DEFAULT_BRANCH>`

In update mode, use the resolved PR `baseRefName` in place of `<DEFAULT_BRANCH>`
in the two merge-base commands before running them.

Use the first successful `git merge-base` output as `BASE_REF`, preferring
`origin/<base-branch>` over the local `<base-branch>`. If both merge-base
commands fail or return no SHA, stop before `git log`/`git diff` and say:
`Could not resolve a merge base against <base-branch>. Fetch the base branch or check that it exists, then re-run /raise-pr.`

Then run these detail commands as separate Bash tool calls with the literal
resolved merge-base SHA substituted for `<BASE_REF>`:

1. `git log "<BASE_REF>"..HEAD --oneline`
2. `git diff "<BASE_REF>"..HEAD --stat -- . ':(exclude)package-lock.json' ':(exclude)dist/**' ':(exclude)build/**'`
3. `git diff "<BASE_REF>"..HEAD --name-status -- . ':(exclude)package-lock.json' ':(exclude)dist/**' ':(exclude)build/**'`

If `git log "<BASE_REF>"..HEAD --oneline` is empty, stop and say there are no
commits ahead of `<base-branch>`.

If the `git remote get-url origin` output is empty in create or draft create mode, stop and say this command needs an `origin` GitHub remote before it can build a compare URL. In update mode, continue because the resolved PR URL identifies the PR. If `git status -sb` lists any changed-file lines (below the `##` branch header), include a short note that uncommitted changes are not included in the pre-filled PR URL or PR update.

**Update mode push guard.** Read the `##` branch header from `git status -sb`. If it shows the branch is `[ahead N]` of its upstream, **stop before running `gh pr edit`** and tell the user to push first, because the description is built from local commits while the PR only contains pushed commits — editing now would overwrite the PR's title and description to describe commits GitHub has not received, leaving the Files-changed tab out of sync. Say exactly: `You have N unpushed commit(s). Push them first (git push), then re-run /raise-pr update so the PR and its description stay in sync.` Do not push it yourself. (If the header shows no upstream, skip this guard — you cannot compute ahead/behind.)

If there is no upstream tracking branch in create or draft create mode, include a short note that the branch must be pushed before the GitHub URL can open a useful compare page. Do not push it yourself.

Do not run a full patch diff across all changed files. Use the `--stat` and `--name-status` output to draft the title and description. If one human-authored file needs more detail, run a per-file diff for only that path; skip lockfiles, `dist/`, `build/`, and generated output.

### 4. Parse repo info

From the remote URL, extract `owner/repo`:

- SSH: `git@github.com:owner/repo.git`
- HTTPS: `https://github.com/owner/repo` (the `.git` suffix may be absent — strip it only if present)

Base branch is `<DEFAULT_BRANCH>` (resolved in step 1) in create and draft create mode, and the resolved PR `baseRefName` in update mode. **Do not hand-encode the branch.** GitHub compare URLs need slashes kept literal (e.g. `compare/main...feat/foo`, never `%2F`); the Node step below encodes each path segment individually, so slashes survive while any other special character is still escaped.

In update mode, prefer the owner/repo from the resolved PR URL when it differs from `origin`.

### 5. Write or keep the PR title

- Aim for a descriptive title of 80–120 characters — long enough to tell a reviewer what changed without opening the description, but not padded with filler.
- Conventional commits prefix (`feat:`, `fix:`, `chore:`, `release:`, etc.)
- No trailing period.
- After the prefix, lead with the dominant change in plain words, then fold in the one or two next-most-substantial concerns separated by commas or "and". Minor items (doc-list additions, hash/version refreshes, wording tweaks) stay out.
- For release branches (e.g. `release/1.7.0`), always include the version number **and** a brief summary of the 2–3 dominant features or fixes shipped — never stop at `release: version X.Y.Z` alone.
- In update mode, treat the existing PR title from `gh pr view` as a user-edited candidate. Keep it when it is specific, accurate for the current branch diff, and follows the rules above. Replace it only when it is stale, generic, misleading, missing the dominant change, or no longer matches the branch diff. If you replace it, preserve any useful wording from the existing title and improve only what needs to change.

### 6. Write the PR description

Two sections only — no other headings, no attribution lines, no emojis, no "this PR does X" opener:

```
## What changed

- **Bold title** — one sentence explaining what this change does and why it matters.
- **Bold title** — one sentence per item. 3–6 bullets total; each covers one distinct concern.

## How to test

[Numbered steps for a person doing manual verification. Each step is a concrete action with an expected result. No automated checks — CI handles those. Plain language, no jargon, 3–6 steps.]
```

**What changed — writing guide:**

- One bullet per distinct concern — group tightly related changes under one bullet rather than splitting every file into its own line.
- Bold the topic (the capability or component), then a dash, then one plain sentence on what changed and why. No nested bullets, no sub-lists.
- **When multiple components of a system are each substantially changed, give each its own bullet** — never collapse them under a single system name. A reviewer cannot tell what changed in "the generator and healer" if those names never appear. If the planner, generator, and healer each had significant reworks, each earns its own bullet.
- Lead with the most impactful changes first; tuck documentation, version stamps, and hash refreshes at the end or omit them entirely if self-explanatory.
- Write for a teammate who has not seen the diff — enough context to know what to review, not a file-by-file inventory.

**How to test — writing guide:**

- Start from the user's real entry point (e.g. "Open Claude Code in your project", "Run the Test Planner agent on…")
- Each step: one action + what to look for (`Do X → you should see Y`)
- Cover the main scenario first, then at least one edge case or failure mode worth checking manually
- Avoid: "run npm test", "check CI", "verify linting" — those are automatic
- Avoid release-gate checks (version bumps, hash/version stamping, package publish dry-runs) — those belong to the release process, not manual verification
- Write as if the person has never seen the feature before but knows the project

### 7. Build URL or update PR

For generated title/body text, use single-quoted shell arguments. Do not wrap
generated prose in double quotes — backticks and `$` would be interpreted by the
shell. If a value contains a literal apostrophe, escape it with the standard
`'\''` sequence, for example `can'\''t`.

**Create or draft create mode.** Build the pre-filled GitHub URL directly in one
`node` Bash tool call. Do not create temp files, do not use heredocs, and do not
chain commands.

Pass the PR title as one argument after `<draft true|false>`, then pass each PR
body logical line as one additional argument, including blank lines as `''`.

```bash
node -e 'function seg(s) { return s.split("/").map(encodeURIComponent).join("/"); } const [branch, base, owner, repo, draftFlag, title, ...bodyLines] = process.argv.slice(1); const body = bodyLines.join("\n").trimEnd(); let url = "https://github.com/" + owner + "/" + repo + "/compare/" + seg(base) + "..." + seg(branch) + "?quick_pull=1&title=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(body); if (draftFlag === "true") url += "&draft=1"; console.log(url); console.log("URL_LENGTH=" + url.length);' '<branch>' '<base>' '<owner>' '<repo>' '<draft true|false>' '<title>' '## What changed' '' '<what changed paragraph>' '' '## How to test' '' '<step 1>' '<step 2>'
```

- `<base>` is `<DEFAULT_BRANCH>` (resolved in step 1) in create and draft create mode.
- Set `<draft true|false>` by checking whether `$ARGUMENTS` contains the word `draft` (case-insensitive).
- `&draft=1` is appended only as a harmless hint — GitHub has **no** documented draft query parameter, so the user still ticks draft from the page dropdown (see step 8); never claim the URL pre-selects it.

**Update mode.** Regenerate both the title and description from the current
branch state and apply them to the PR resolved in step 2. Use one `gh pr edit`
Bash tool call. Do not create temp files, do not use heredocs, and do not chain
commands.

Pass the full PR body as one single-quoted `--body` argument. The body argument
may span multiple lines inside the single quotes. Escape any literal apostrophe
with `'\''`.

```bash
gh pr edit '<resolved-pr-url>' --title '<title>' --body '<description>'
```

### 8. Output

In create or draft create mode, output one clickable link, then the title and description separately so the user can read them before clicking. If `URL_LENGTH` from the Node step exceeds ~8000, skip the link and output the title and body as plain text to paste manually, with a one-line note explaining why.

Default:

```
**PR link (pre-filled):**
[Open on GitHub]({url})

**Title:** {title}

**Description:**
{description}

Open the link, review or edit the fields, then click **Create pull request**. _If GitHub shows your first commit's message as the title instead of the one above, just paste the title shown here._
```

Draft mode:

```
**PR link (pre-filled, draft):**
[Open on GitHub]({url})

**Title:** {title}

**Description:**
{description}

Open the link and review or edit the fields. To make it a draft, click the **▾** next to **Create pull request** and choose **Create draft pull request**.
```

Update mode (title and description synced to the existing PR):

```
**Updated PR (title + description synced):**
[Open on GitHub]({resolved-pr-url})

**Title:** {title}

**Description:**
{description}
```
