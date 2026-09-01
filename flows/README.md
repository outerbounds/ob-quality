# Meta Flows

## Anaconda Models flows

The Python files in this directory are independent Metaflow flows that exercise
Anaconda Models functionality on an Outerbounds cluster. Each flow validates a
focused scenario and can be run independently.

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
a flow. Remote task pods must receive `OBP_API_SERVER`, `OBP_PERIMETER`, and
`METAFLOW_SERVICE_HEADERS`; the platform normally injects these values.

### Run

From the `flows` directory, run any flow with:

```bash
python <flow_file>.py --environment=fast-bakery run --with kubernetes
```

These are real-cluster E2E flows. They interact with remote services and may
download artifacts, so they cannot complete against Metaflow's local runtime.
