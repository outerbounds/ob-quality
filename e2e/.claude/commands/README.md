# Slash Commands

These slash commands are installed via `npx anaconda-pw-setup` for both Claude Code (`.claude/commands/`) and Kilo (`.kilo/commands/`, generated from the same source by `scripts/build-kilo-commands.js`).

## Available Commands

| Command                                          | Description                                                  |
| ------------------------------------------------ | ------------------------------------------------------------ |
| [`/commit-msg`](#commit-msg)                     | Generate commit message suggestions                          |
| [`/install-sesame`](#install-sesame)             | Install the Sesame MCP server                                |
| [`/pr-review`](#pr-review)                       | Review changes against repo standards                        |
| [`/raise-pr`](#raise-pr)                         | Generate a pre-filled GitHub PR URL or update an existing PR |
| [`/reconcile-ai-updates`](#reconcile-ai-updates) | Reconcile AI file updates with upstream changes              |
| [`/refactor-tests`](#refactor-tests)             | Triage and refactor tests toward repo standards              |

---

## commit-msg

**Usage:** `/commit-msg [staged|all]`

Suggest a branch name and generate two commit message options:

- A compact commit subject (short, conventional commits style)
- A descriptive commit subject (longer, more detailed)

On macOS, the descriptive version is automatically copied to the clipboard (falls back to manual copy on other platforms).

**Arguments:**

- _(no argument)_ — auto-detect based on `git status` (may prompt if both staged and unstaged/untracked changes exist)
- `staged` — analyze staged changes only
- `all` — analyze everything (staged + unstaged + untracked)

---

## install-sesame

**Usage:** `/install-sesame`

Run the Sesame MCP installation for your OS:

1. Verifies GitHub CLI is installed and authenticated
2. Downloads and inspects the installer from `Anaconda-Sandbox/sesame`
3. Registers the MCP server — `claude mcp add` on Claude Code, a `claude_desktop_config.json` merge on Claude Desktop, or an `mcp` entry in `kilo.jsonc`/`kilo.json` on Kilo
4. Adds `sesame` to PATH

---

## pr-review

**Usage:** `/pr-review [pr-number [post]] | [base-ref] [-- <note>]`

Review pending Playwright QA changes, a branch, or a PR against this project's QA standards (`CLAUDE.md` + `qa-automation-quality` guidelines) before pushing.

**Arguments:**

- No arguments — reviews local work vs the default branch
- `<pr-number>` — review an existing PR
- `<pr-number> post` — review and post comments to the PR
- `<base-ref>` — compare against a specific branch/ref
- `-- <note>` — add context for the review

---

## raise-pr

**Usage:** `/raise-pr [draft|update [pr-url]]`

Generate a pre-filled GitHub PR URL so you can review the title and description, edit if needed, and click **Create pull request** yourself. In update mode, regenerate and apply both title and description to an existing PR.

**Modes:**

- No argument — generate a pre-filled GitHub compare URL (does not create the PR)
- `draft` — same as above, with a hint to select draft mode on GitHub
- `update` — update the existing PR for the current branch
- `update <pr-url>` — update a specific PR by URL

**Features:**

- Generates a conventional commits-style title (80-120 characters)
- Creates a structured description with "What changed" and "How to test" sections
- In update mode, syncs the PR title and description via `gh pr edit`

**Note:** This command does not push your branch or create the PR directly — it gives you a pre-filled URL to review before clicking create.

---

## reconcile-ai-updates

**Usage:** `/reconcile-ai-updates [full|reconcile-only|prepare-only|report] [--no-stage] [--no-overwrite]`

Reconcile AI file updates installed by `@anaconda/playwright-utils` with a safe two-pass workflow.

When `anaconda-pw-setup` runs, you must choose: keep your edits (and miss upstream improvements) or overwrite them (and lose your project customizations). This command takes **both** — upstream improvements land, project facts are restored on top — with a git-staged recovery snapshot so an overwrite can never silently destroy your work.

**Modes:**

- `full` (default) — run both passes: prepare baseline, then overwrite and reconcile
- `prepare-only` — stage your current AI files as a recovery baseline
- `reconcile-only` — run the reconcile/merge pass (assumes baseline already staged and overwrite already ran)
- `report` — show what would be reconciled without making changes

**Flags:**

- `--no-stage` — print which baseline files would be staged, then stop (overwrite is refused without a staged baseline)
- `--no-overwrite` — skip the overwrite pass (equivalent to `prepare-only`)

**Requires:** `.claude/reconcile-ai-profile.json` for project-specific fact restoration. Without a profile, the command runs safely but leaves all merge decisions to you.

---

## refactor-tests

**Usage:** `/refactor-tests [all | <file.ts|spec> | "<test/describe title>" | @tag … | <free text>] [dry-run|report|apply] [--force]`

Triage and refactor existing Playwright tests/page objects toward repo standards. By default, triages only files changed since the last run, auto-applies safe mechanical fixes, and proposes (never auto-executes) risky merges, duplicate removals, and oversized-test splits.

**Scope:**

- No argument — files changed since last run (exits fast if nothing stale)
- `all` — all test files
- `<file.ts>` or `<spec>` — specific file
- `"<test/describe title>"` — specific test or describe block by title
- `@tag` — tests with that tag

**Modes:**

- No flag (default) — auto-apply safe fixes, prompt for each risky change individually
- `apply` — auto-apply safe fixes, batch-confirm risky changes in one gate
- `dry-run` — show what would change without applying
- `report` — generate a report only

**Flags:**

- `--force` — re-triage even if nothing changed since last run
