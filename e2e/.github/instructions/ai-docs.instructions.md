---
applyTo: '.claude/**,.cursor/**,AGENTS.md,CLAUDE.md,**/*.md'
---

# AI Docs And Markdown

Documentation is part of the automation contract. Review docs as executable guidance, not prose.

## Core Rules

- Verify all commands, flags, file paths, aliases, and script names against the current repository state.
- Keep guidance consistent with canonical sources before updating examples.
- Prefer precise edits over broad rewrites when behavior is unchanged.
- Preserve intent and compatibility for existing references and links.

## Source Of Truth

- `CLAUDE.md` is the main project guide for agents and maintainers.
- `AGENTS.md` is a thin pointer to canonical files; keep it short.
- `.claude/skills/anaconda-playwright-utils/SKILL.md` and its `references/**` files define the library API rules for test code.
- `.claude/skills/qa-automation-quality/references/qa-automation-guidelines.md` defines review and quality gate expectations.
- `.cursor/rules/**` should point to the same conventions, not introduce a competing standard.

## Drift Checks

- When a command, flag, path, script name, locator rule, or workflow changes, search for stale references across `.claude/`, `.github/`, `.cursor/`, root docs, and examples.
- Examples must be copy-paste plausible: imports resolve, path aliases exist, commands exist, and helper names match the library API.
- Keep POM examples consistent with the real pattern: page object plus fixture plus spec.
- Do not invent generated-file behavior. Verify setup and command claims against actual files or package documentation.
- If behavior differs by context (consumer repo vs library repo), state that difference explicitly.

## Markdown Hygiene

- Keep markdown Prettier-safe. If formatting creates visible escape artifacts, fix only affected lines.
- Avoid style-only rewrites when behavior is already clear and accurate.
- Heading renames can break links and anchors; check references before approving.
- Preserve fenced code language tags and keep examples runnable.
- After markdown edits, run `npx prettier --check <file>.md` or the repo format check.

## Review Checklist

Flag these as findings:

- Docs contradict `CLAUDE.md`, the utility skill, or the locator reference.
- A documented command, npm script, path alias, or file path does not exist.
- A changed behavior is updated in one doc but stale elsewhere.
- A code block violates the project imports, POM, locator, or assertion rules.
- Markdown formatting visibly degrades after Prettier.
