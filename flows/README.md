# Meta Flows

## Anaconda Models flow

`test_ac_models_flow.py` exercises model discovery, a GGUF model download, a
safetensors collection download, and model access-policy enforcement on an
Outerbounds cluster.

### Setup

Use an Outerbounds-supported Python version and install the client package in
an isolated environment:

```bash
cd flows
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Configure a Metaflow profile for the target Outerbounds cluster before running
the flow. Remote task pods must receive `OBP_API_SERVER`, `OBP_PERIMETER`, and
`METAFLOW_SERVICE_HEADERS`; the platform normally injects these values.

The final policy assertion expects the target perimeter to deny access to
`Llama-3.2-1B` (the source flow uses the `dev-valay` policy that denies all
`Llama*` models).

### Run

```bash
python test_ac_models_flow.py --environment=fast-bakery run --with kubernetes
```

This is a real-cluster E2E flow. It downloads model artifacts remotely and
cannot complete against Metaflow's local runtime.
