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
- `check-flow-filenames`: staged-index validation that every tracked Python file
  containing a `FlowSpec` uses the `*_flow.py` suffix.
- `check-flows`: flow discovery, repository conventions, and native Metaflow
  definition and DAG validation.
- `test-flow-tools`: unit tests for the custom checker and tool-version
  consistency.

During a normal `git commit`, staged files determine which hooks run. A staged
`*_flow.py` file under `flows/` activates Ruff and native Metaflow validation;
other staged Python files under `flows/` activate Ruff. Any staged Python file
activates repository-wide FlowSpec filename validation. Checker tests run only
when `check_flows.py`, its tests, requirements, or tool configuration changes.
The native Metaflow check runs only for staged flow files during normal runs,
while filename and deletion checks use the staged index. This catches rewritten
delete/add pairs without depending on Git rename detection and requires the
index to retain at least one tracked flow.

Added, copied, modified, or renamed files under `e2e/tests/` and
`e2e/test-setup/` separately activate the Playwright format, lint, and quality
checks; deletion-only e2e changes skip that staged-file pipeline. A commit
touching both scopes runs both. Ruff also fixes staged Python lint and formatting
issues. All staged changes are checked for conflict markers and whitespace
errors. Neither project check authenticates to Outerbounds or starts a
Kubernetes workload.

## Flow Validation

Every executable QA flow must:

- Use a `*_flow.py` filename.
- Retain the `*_flow.py` suffix when renamed or moved.
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

### Model Catalog inference workflows

These workflows are based on `inference-images/examples/workflows`, with the two
vLLM modes split into independently runnable files:

- `models/mc_llamacpp_cpu_flow.py`: Model Catalog llama.cpp CPU inference,
  Qwen2.5-0.5B-Instruct with q8_0; Conda provides the CPU engine.
- `models/mc_llamacpp_gpu_flow.py`: Model Catalog llama.cpp GPU inference,
  Qwen2.5-0.5B-Instruct with q8_0.
- `models/mc_vllm_gpu_flow.py`: Model Catalog vLLM direct GPU inference, Qwen3-0.6B.
- `models/mc_vllm_api_gpu_flow.py`: The same model through an OpenAI-compatible
  API server inside the GPU task. No entry-point edits are needed.

GPU flows use the `metaflow-gpu` workflow pool and the source prebuilt images.
These flows request 2 CPUs, 8192 MB memory and 10240 MB disk. GPU flows also request
one GPU. Run from `flows` in your configured Outerbounds environment:

```bash
python models/mc_llamacpp_gpu_flow.py run
python models/mc_vllm_gpu_flow.py run
python models/mc_vllm_api_gpu_flow.py run
```

Run one at a time. Do not add `--environment=fast-bakery` or global
`--with kubernetes` to these GPU commands. They run inference inside a temporary
Metaflow task, not against your deployed app. Inspect the printed response and
ensure both `start` and `end` complete. The llama.cpp GPU flow additionally checks
for a nonempty response. These are smoke tests, not accuracy benchmarks.

The CPU flow uses `metaflow-cpu`, configured for **Metaflow Tasks**, with 2 CPUs,
8192 MB memory and 10240 MB disk, and no GPU. Wait for pool creation to finish,
then run:

```bash
python models/mc_llamacpp_cpu_flow.py --environment=fast-bakery run
```

### Deploy and test inference

From `flows`, deploy a GPU app with:

```bash
outerbounds app deploy \
  --config-file models/deployments/mc-llamacpp-gpu-config.yaml \
  --no-deps \
  --skip-code-package
```

After it is ready, get the API URL:

```bash
outerbounds app info --name mc-llamacpp-gpu-app
```

Test a prompt using the `api-c-...` URL shown above:

```bash
python models/deployments/client.py \
  --url "https://<api-url>" \
  --prompt "Explain how gyroscopes work in three sentences."
```
