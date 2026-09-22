# Metaflow Smoke Tests

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
pre-commit run check-flow-filenames --all-files
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
errors. Native Metaflow validation does not launch workloads, but importing
Outerbounds can fetch remote configuration using the active profile and require
network access and valid credentials.

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
It validates definitions and DAG structure without downloading models or starting
flow runs. It can still require access to the configured Outerbounds API.
Passing this check does not verify pool availability, image access, model access,
or inference behavior.

For repository-only discovery and convention checks without importing Metaflow:

```bash
python flows/scripts/check_flows.py --discovery-only
```

To validate just one flow:

```bash
python flows/scripts/check_flows.py flows/models/llamacpp_cpu_direct_inference_flow.py
```

Configure a Metaflow profile for the target Outerbounds cluster before running
a flow. Remote task pods must receive `OBP_API_SERVER`, `OBP_PERIMETER`, and
`METAFLOW_SERVICE_HEADERS`; the platform normally injects these values.

### Run

From the `flows` directory, run the catalog browse, download, and local-cache
flows with the following pattern. Use the separate commands below for inference:

```bash
python <domain>/<flow_file>.py --environment=fast-bakery run --with kubernetes
```

These are real-cluster E2E flows. They interact with remote services and may
download artifacts; the supported test setup is the configured Outerbounds
cluster, not an unconfigured local runtime.

| Flow under `models/` | Coverage |
| --- | --- |
| `browse_models_flow.py` | Catalog listing and model metadata assertions. |
| `download_gguf_model_flow.py` | GGUF download and file validation. |
| `download_safetensors_model_flow.py` | Safetensors collection download and validation. |
| `local_cache_model_flow.py` | Cold download followed by reuse in the same task. |

For example:

```bash
python models/local_cache_model_flow.py --environment=fast-bakery run --with kubernetes
```

### Model Catalog inference workflows

These workflows are based on `inference-images/examples/workflows`, with the two
vLLM modes split into independently runnable files:

- `models/llamacpp_cpu_direct_inference_flow.py`: Model Catalog llama.cpp CPU
  direct inference,
  Qwen2.5-0.5B-Instruct with q8_0; Conda provides the CPU engine.
- `models/llamacpp_gpu_direct_inference_flow.py`: Model Catalog llama.cpp GPU
  direct inference, Qwen2.5-0.5B-Instruct with q8_0.
- `models/vllm_gpu_direct_inference_flow.py`: Model Catalog vLLM direct GPU
  inference, Qwen3-0.6B.
- `models/vllm_gpu_openai_api_inference_flow.py`: The same model through an
  OpenAI-compatible API server inside the GPU task. No entry-point edits are needed.

GPU flows use the source prebuilt images and request 2 CPUs, 8192 MB memory,
10240 MB disk, and one GPU. Set `METAFLOW_GPU_COMPUTE_POOL` and
`METAFLOW_CPU_COMPUTE_POOL` to pools available in your target environment before
launching the flows. For example, for `dev-coldbrewcrew`:

```bash
export METAFLOW_CPU_COMPUTE_POOL=metaflow-cpu
export METAFLOW_GPU_COMPUTE_POOL=metaflow-gpu
```

These variables are read when the flow is loaded. If unset, the flows leave
pool selection to the platform configuration; there is no hardcoded pool default.
An unset variable does not guarantee a suitable default exists, particularly for
GPU tasks. These variables select pools only for the four inference flows below;
they do not switch the active Metaflow profile or configure the other flows.

Use `export` for terminal sessions and job environment variables for CI. A `.env`
file is not loaded automatically. To load a trusted, shell-compatible `.env` file
from your current directory before running a flow:

```bash
set -a
source .env
set +a
```

Set the variables before each new flow invocation when switching environments.
The target environment must also provide access to the selected models and the
GPU images referenced in the flows.

Run GPU flows from `flows`:

```bash
python models/llamacpp_gpu_direct_inference_flow.py run
python models/vllm_gpu_direct_inference_flow.py run
python models/vllm_gpu_openai_api_inference_flow.py run
```

Run one at a time. Do not add `--environment=fast-bakery` or global
`--with kubernetes` to these GPU commands. They run inference inside a temporary
Metaflow task, not against your deployed app. Inspect the printed response and
ensure both `start` and `end` complete. Every inference flow also checks for a
non-empty response. These are smoke tests, not accuracy benchmarks.

The CPU flow requests 2 CPUs, 8192 MB memory and 10240 MB disk, and no GPU. It
uses `METAFLOW_CPU_COMPUTE_POOL`:

```bash
python models/llamacpp_cpu_direct_inference_flow.py --environment=fast-bakery run
```

### Results and troubleshooting

A successful run completes `start` and `end` without assertion errors. Confirm
the selected pool in Outerbounds task details. For failures, include the flow
name, run ID, environment, pool, and failing task logs; check credentials, pool
capacity, image/model access, and disk space.

Inference steps have a 15-minute `@timeout` and no `@retry`. The vLLM API server's
`max_retries` setting does not retry Metaflow tasks.

### Cleanup and cache retention

For these Anaconda-backed flows, cleanup is best-effort:

- **Success or step exception:** `@llamacpp` and `@vllm` attempt to release the
  engine or task-local API server and delete downloaded models in `finally`.
- **Initialization failure, cancellation, or timeout:** cleanup may be bypassed.
  Verify the remote task has stopped in Outerbounds; stopping the local launcher
  alone is not proof. Ephemeral files are removed with their task storage.
- **Retained caches:** `@anaconda_models` does not delete downloads automatically.
  The download flows rely on storage teardown. The local-cache test explicitly
  removes its unique directory in `finally`, unless termination bypasses it.
  Persistent/shared caches and Metaflow artifacts require separate management.

Use `debug=True` on the inference decorators for cleanup logs, and check for
deletion warnings. These smoke tests do not verify cleanup under every failure
or cancellation condition.

### Deploy and test inference

This is a separate, persistent app deployment, not a Metaflow smoke-test run.
The YAML currently selects `coldbrewcrew-pool`; update its `compute_pools` for
the target environment before deploying. The `METAFLOW_*_COMPUTE_POOL` variables
above do not override this YAML. Flow completion or cancellation does not remove
the deployed app; manage its lifecycle separately in Outerbounds.

From `flows`, deploy a GPU app with:

```bash
outerbounds app deploy \
  --config-file models/deployments/llamacpp_gpu_inference_config.yaml \
  --no-deps \
  --skip-code-package
```

After it is ready, get the API URL:

```bash
outerbounds app info --name mc-llamacpp-gpu-app
```

Test a prompt using the `api-c-...` URL shown above:

```bash
python models/deployments/inference_client.py \
  --url "https://<api-url>" \
  --prompt "Explain how gyroscopes work in three sentences."
```
