# Meta Flows

## Structure

Flows are organized by product domain. Each domain directory contains
independent Metaflow flows and their supporting test data and utilities. Each
flow validates a focused scenario and can be run independently on an
Outerbounds cluster.

## Pre-Commit Setup

Run all setup commands from the repository root. Use an Outerbounds-supported
Python version to create an isolated environment:

```bash
cd /path/to/ob-quality
python3 -m venv flows/.venv
source flows/.venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r flows/requirements-dev.txt
```

`requirements-dev.txt` includes the runtime requirements, so a separate
installation of `flows/requirements.txt` is not required for development.

Git honors a single hook path, and the repository gives it to Husky so the
Playwright checks keep their lint-staged auto-fixes. `.husky/pre-commit` calls
`pre-commit run` when a commit stages files under `flows/`, so do not run
`pre-commit install` — it refuses to write a hook while `core.hooksPath` is set.

Install the shared hook from the repository root:

```bash
npm --prefix e2e install
```

Confirm that Husky owns the hook path and that `pre-commit` is callable from it:

```bash
test "$(git config --get core.hooksPath)" = ".husky/_" && echo "husky installed"
pre-commit --version
```

The hook falls back to `flows/.venv/bin/pre-commit` when the virtual environment
is not active, so a commit from an editor or GUI client still runs the flow
checks.

### Test the Hook

Run all flow hooks against all tracked files:

```bash
pre-commit run --all-files
```

Run only the flow-related hooks:

```bash
pre-commit run ruff-check --all-files
pre-commit run ruff-format --all-files
pre-commit run check-flows --all-files
pre-commit run test-flow-tools --all-files
```

The flow hooks perform these checks:

- `ruff-check`: Python linting, import ordering, common bug checks, and public
  method docstrings.
- `ruff-format`: Python formatting.
- `check-flows`: flow discovery, repository conventions, and native Metaflow
  definition and DAG validation.
- `test-flow-tools`: unit tests for the custom checker and tool-version
  consistency.

<<<<<<< HEAD
During a normal `git commit`, a staged `*_flow.py` file under `flows/` activates
all four flow hooks; other staged Python files activate Ruff and `test-flow-tools`.
Staged files under `e2e/` separately activate the Playwright checks; a commit
touching both runs both.
`flows/requirements.txt`, `flows/requirements-dev.txt`, or
`.pre-commit-config.yaml` is staged, so a version bump alone still triggers the
tool-version consistency checks. The native Metaflow check runs only for staged
flow files, while discovery and repository-wide convention checks still inspect all
repository flows. `test-flow-tools` runs the complete local test suite. Neither hook
=======
During a normal `git commit`, staged files determine which hooks run. A staged
`*_flow.py` file under `flows/` activates all four flow hooks; other staged
Python files activate Ruff and `test-flow-tools`. The flow requirements files,
`.pre-commit-config.yaml`, and `pyproject.toml` activate the complete Python
suite, so configuration changes cannot bypass its checks. The native Metaflow
check runs only for staged flow files during normal runs, while deletion checks
still inspect the repository-wide flow inventory. `test-flow-tools` runs the
complete local test suite.

Staged files under `e2e/tests/` and `e2e/test-setup/` separately activate the
Playwright checks; a commit touching both scopes runs both. Neither check
>>>>>>> bd3baf4 (fix pre-commit routing edge cases)
authenticates to Outerbounds or starts a Kubernetes workload.

If Ruff modifies a file, review and stage the change before committing again:

```bash
git add <updated-files>
git commit
```

## Flow Validation

Every executable QA flow must:

- Use a `*_flow.py` filename.
- Define exactly one top-level `FlowSpec` subclass.
- Use a flow class name that is unique across all domains.
- Instantiate that class under `if __name__ == "__main__"`.

To validate only flow discovery and Metaflow definitions:

```bash
python flows/scripts/check_flows.py
```

This command runs Metaflow's native `check` command for every discovered flow.
It validates definitions and DAG structure without authenticating, downloading
models, or starting local or remote flow runs.

Configure a Metaflow profile for the target Outerbounds cluster before running
a flow. Remote task pods must receive `OBP_API_SERVER`, `OBP_PERIMETER`, and
`METAFLOW_SERVICE_HEADERS`; the platform normally injects these values.

### Run

From the `flows` directory, run any flow with:

```bash
python <domain>/<flow_file>.py --environment=fast-bakery run --with kubernetes
```

These are real-cluster E2E flows. They interact with remote services and may
download artifacts, so they cannot complete against Metaflow's local runtime.
