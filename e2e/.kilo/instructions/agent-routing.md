# Agent Routing (Kilo)

This file is loaded by Kilo (kilo.ai) via `.kilo/kilo.jsonc`'s `instructions`
array. It is a routing rule, not a suggestion: the main Kilo session must
delegate the work below to the matching subagent via the `task` tool — it
must never plan, write, or fix Playwright tests inline itself, even when it
has already read the plan file or the change looks small.

| User intent (examples)                                                                                                                                              | Required agent                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| "generate tests" / "write tests" / "create tests" / "add a spec" / "generate test cases from a plan" / "generate test cases for X" (noun phrasing still means code) | Plan precondition below → `playwright-test-generator` |
| "plan tests" / "create a test plan" / "propose test cases" / "what test cases should we cover" (no code requested, plan/list output only)                           | `playwright-test-planner`                             |
| "fix failing tests" / "heal tests"                                                                                                                                  | `playwright-test-healer`                              |

These same agents own API work: "plan endpoint coverage" / "propose API test cases"
routes to `playwright-test-planner`; "write API tests" / "add API coverage" / "test this endpoint"
routes to `playwright-test-generator`; "fix failing API tests" routes to `playwright-test-healer`.
The planner owns coverage across UI and API cases in a feature. Each agent uses
`api-test-automation` for API cases; a mixed feature keeps both types in the same plan.
The plan precondition below applies to API and mixed generation requests too.

## Dispatch validation (required before execution)

Immediately before every `task` call for this workflow, the main session must
validate the current stage against this exact mapping:

| Workflow stage                          | Required `subagent_type`    |
| --------------------------------------- | --------------------------- |
| Create or update a test plan            | `playwright-test-planner`   |
| Generate test code from a verified plan | `playwright-test-generator` |
| Diagnose and fix a failing test         | `playwright-test-healer`    |

Do not issue the `task` call unless its `subagent_type` exactly matches that
stage. `general` is not a substitute, intermediary, or recovery agent for any
of these stages. Do not start a generic-agent exploration to work around an
unavailable specialist. If the required specialist cannot be invoked, stop
before execution and report the unavailable agent and the blocked stage to the
user.

If a routing mistake has already produced findings, pass those findings and
their provenance to the correctly selected specialist. That specialist verifies
the evidence needed for its work and fills only material gaps; wrong routing
alone does not require repeating every earlier exploration.

## Plan precondition for generation

Before calling `playwright-test-generator`, the **main session** must obtain a plan:

1. Read any plan supplied by the user; otherwise search `tests/test-plans/**/*.md`
   and read the relevant candidates. Confirm the plan covers the requested scope
   and each case has a `**Disposition:**`. A matching filename alone is not enough.
2. If no usable plan covers the scope, call `playwright-test-planner` directly via
   `task` from the main session. Pass the user's request, requirements, target
   environment, and constraints; name any existing related plan so the planner
   updates it rather than creating a duplicate. Ask it to return
   `PLAN: tests/test-plans/<file>.md` when finished. Wait for it to complete.
3. Read and check the returned plan before proceeding. If the planner asks for
   clarification, surface that question and obtain the answer before continuing.
   If it returns no usable plan, report the missing or incomplete plan and resolve
   that handoff before starting the generator. Never substitute inline planning.
4. Call `playwright-test-generator` directly via `task` from the main session,
   including the verified plan path, original request, environment, and constraints.

These calls are sequential siblings: main → planner (when needed), then main →
generator. Do not hand off a planless request expecting the generator to spawn the
planner. Its defensive fallback remains available for direct/manual invocations;
normal routing must not depend on nested `task` support.

To verify routing, inspect the task trace: the planner completes as a direct child
of main before main starts the generator with its saved plan path. Per-case
`**Test type:**` fields verify the new plan's structure, not the task-call depth.

**Disambiguation note:** "generate test cases" and "create test cases" mean _write the
runnable code_ (page object or API class, fixture, spec) — follow the plan precondition and finish with the generator,
even though "test cases" sounds like plan/list language. Treat a request as planning-only when
the user asks for a plan/proposal/list explicitly (e.g. "plan", "propose", "what should
we cover"). A generation request may require the planner first, but does not end
with planning alone.

**No exceptions.** Reading a plan file or exploring the repo to decide which
agent to spawn is fine; writing the test plan, test code (page object,
fixture, spec), or fix directly in the main session instead of spawning the
agent above is not — always spawn the required agent via `task`, even for
work that looks small enough to do inline.
