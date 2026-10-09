"""Read and update MODEL_ACCESS policy using explicit API credentials.

Run from flows/:
    python -m models.utils.policy_api get --output /tmp/model-policy.json
    python -m models.utils.policy_api put --input /tmp/model-policy-edited.json

Set OBP_API_SERVER, OBP_PERIMETER, and MODEL_POLICY_API_HEADERS (a JSON
object containing the authentication headers used by your API client).
The input contains both 'policy' and 'version'; preserve the original snapshot.
Versions are required resource metadata, not protection against concurrent writes.
MODEL_ACCESS status may be ignored by the server; do not rely on 'disabled'
to stop enforcement without verifying the deployed API behavior.
"""

from __future__ import annotations

import argparse
import json
import os
import tempfile
import time
from copy import deepcopy
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


class PolicyApiError(RuntimeError):
    """Policy request failed or returned an unexpected response."""


class ConcurrentPolicyChangeError(PolicyApiError):
    """The live policy is neither the applied policy nor the expected base."""


def model_access_spec(policy: dict) -> dict:
    """Return `spec.model_access_policy` from a policy object."""
    if not isinstance(policy, dict):
        raise ValueError("Expected a policy object")
    spec = policy.get("spec")
    if not isinstance(spec, dict) or not isinstance(spec.get("model_access_policy"), dict):
        raise ValueError("Expected spec.model_access_policy")
    return spec["model_access_policy"]


def write_recovery_snapshot(snapshot: dict, directory: str | Path | None = None) -> Path:
    """Write `snapshot` to a new file so it outlives the writing process.

    Normal exception cleanup cannot run if the process is killed, so the
    snapshot is persisted before any policy mutation is attempted.
    """
    ModelPolicyClient.validate_snapshot(snapshot)
    base = Path(directory) if directory is not None else Path(tempfile.gettempdir())
    base.mkdir(parents=True, exist_ok=True)
    path = base / f"model-policy-recovery-{time.time_ns()}-{os.getpid()}.json"
    # Exclusive creation keeps a recovery file from overwriting another one.
    with path.open("x", encoding="utf-8") as output:
        json.dump(snapshot, output, indent=2)
        output.write("\n")
    return path


def build_model_access_policy(policy: dict, model_access_spec: dict) -> dict:
    """Return a copy of `policy` carrying `model_access_spec`.

    Only `spec.model_access_policy` is replaced, so the caller's `kind`,
    `status`, and any other server-managed fields are preserved for the PUT.
    """
    if not isinstance(policy, dict):
        raise ValueError("Expected a policy object")
    if not isinstance(model_access_spec, dict):
        raise ValueError("Expected a model access spec object")
    updated = deepcopy(policy)
    spec = updated.get("spec")
    updated["spec"] = {
        **(spec if isinstance(spec, dict) else {}),
        "model_access_policy": deepcopy(model_access_spec),
    }
    return updated


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        """Do not forward authentication headers to a redirect destination."""
        return None


class ModelPolicyClient:
    def __init__(self, server: str, perimeter: str, headers: dict[str, str]):
        server = server.strip()
        if "://" not in server:
            server = f"https://{server}"
        parsed = urlsplit(server)
        if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
            raise ValueError("OBP_API_SERVER must be an HTTPS URL without credentials")
        if parsed.path not in ("", "/") or parsed.query or parsed.fragment:
            raise ValueError("OBP_API_SERVER must contain only the server origin")
        perimeter = perimeter.strip()
        if not perimeter:
            raise ValueError("OBP_PERIMETER must not be empty")
        if not headers or not all(
            isinstance(key, str) and isinstance(value, str) for key, value in headers.items()
        ):
            raise ValueError("MODEL_POLICY_API_HEADERS must be a non-empty string-to-string object")
        self.base_url = f"{server.rstrip('/')}/v1/perimeters/{quote(perimeter, safe='')}"
        self.headers = dict(headers)
        self.opener = build_opener(_NoRedirect())

    def _request(self, method: str, suffix: str, payload: dict | None = None) -> dict:
        request = Request(
            self.base_url + suffix,
            data=None if payload is None else json.dumps(payload).encode(),
            headers={
                **self.headers,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method=method,
        )
        try:
            with self.opener.open(request, timeout=30) as response:
                result = json.load(response)
        except HTTPError as exc:
            hint = {
                401: "Check authentication headers and perimeter permissions.",
                403: "Check perimeter policy permissions.",
                409: "Read the latest policy and review changes before retrying.",
            }.get(exc.code, "Check the API server logs.")
            raise PolicyApiError(f"{method} {suffix}: HTTP {exc.code}. {hint}") from None
        except (URLError, TimeoutError):
            raise PolicyApiError(f"{method} {suffix}: connection failed or timed out") from None
        except (ValueError, UnicodeError):
            raise PolicyApiError(f"{method} {suffix}: response was not valid JSON") from None
        if not isinstance(result, dict):
            raise PolicyApiError("Expected a JSON object from the policy API")
        return result

    @staticmethod
    def validate_snapshot(snapshot: dict) -> None:
        """Reject missing versions and updates to unrelated policy kinds."""
        if not isinstance(snapshot, dict):
            raise ValueError("Expected a policy snapshot object")
        if not isinstance(snapshot.get("version"), str) or not snapshot["version"].strip():
            raise ValueError("Expected a non-empty policy version string")
        policy = snapshot.get("policy")
        if not isinstance(policy, dict) or policy.get("kind") != "MODEL_ACCESS":
            raise ValueError("Expected exactly one MODEL_ACCESS policy")
        if policy.get("status") not in ("enabled", "disabled"):
            raise ValueError("Expected policy status enabled or disabled")
        spec = policy.get("spec")
        if not isinstance(spec, dict) or not isinstance(spec.get("model_access_policy"), dict):
            raise ValueError("Expected spec.model_access_policy")

    def get(self) -> dict:
        """Read the model policy and its current resource version."""
        result = self._request("GET", "/policies?kind=MODEL_ACCESS")
        policies = result.get("policies", [])
        if not isinstance(policies, list) or len(policies) != 1:
            raise PolicyApiError("Expected exactly one MODEL_ACCESS policy in GET response")
        snapshot = {"version": result.get("version"), "policy": policies[0]}
        self._validate_response(snapshot, "GET")
        return snapshot

    def put(self, snapshot: dict, *, verify: bool = False) -> dict:
        """Apply a snapshot, optionally reading it back; concurrent overwrites remain possible."""
        self.validate_snapshot(snapshot)
        result = self._request(
            "PUT", "/policy", {"version": snapshot["version"], "policy": snapshot["policy"]}
        )
        self._validate_response(result, "PUT")
        if verify:
            try:
                saved = self.get()
            except (PolicyApiError, OSError) as exc:
                raise PolicyApiError(
                    "PUT was accepted, but GET verification failed; the policy may have changed"
                ) from exc
            if saved["policy"] != result["policy"]:
                raise PolicyApiError(
                    "PUT was accepted, but GET does not match the returned policy; "
                    "check for propagation delay or concurrent writes"
                )
            return saved
        return result

    @classmethod
    def _validate_response(cls, snapshot: dict, method: str) -> None:
        """Separate malformed API responses from invalid caller input."""
        try:
            cls.validate_snapshot(snapshot)
        except ValueError as exc:
            raise PolicyApiError(f"Invalid {method} policy response: {exc}") from exc


def restore_base_policy(client: ModelPolicyClient, base_policy: dict, applied_spec: dict) -> str:
    """Put `base_policy` back unless another writer changed the live policy.

    Returns "unchanged" when the live spec already matches the base, or
    "restored" after a successful write. Versions do not protect this API
    against concurrent writes, so the live spec is compared with the spec this
    run applied and a mismatch is reported instead of overwritten.
    """
    base_spec = model_access_spec(base_policy)
    if not isinstance(applied_spec, dict):
        raise ValueError("Expected a model access spec object")

    live = client.get()
    live_spec = model_access_spec(live["policy"])
    if live_spec == base_spec:
        return "unchanged"
    if live_spec != applied_spec:
        raise ConcurrentPolicyChangeError(
            "Live policy is neither the applied policy nor the base policy, so another "
            f"writer changed it; not overwriting. Live spec: {json.dumps(live_spec)}"
        )

    restored = client.put({"version": live["version"], "policy": base_policy}, verify=True)
    restored_spec = model_access_spec(restored["policy"])
    if restored_spec != base_spec:
        raise PolicyApiError(
            f"Restored policy does not match the base policy; expected "
            f"{json.dumps(base_spec)}, got {json.dumps(restored_spec)}"
        )
    return "restored"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("get").add_argument("--output", type=Path, required=True)
    put_command = commands.add_parser("put")
    put_command.add_argument("--input", type=Path, required=True)
    put_command.add_argument(
        "--verify", action="store_true", help="Read back and compare the saved policy after PUT"
    )
    args = parser.parse_args()
    try:
        headers = json.loads(os.environ["MODEL_POLICY_API_HEADERS"])
        if not isinstance(headers, dict):
            raise ValueError("MODEL_POLICY_API_HEADERS must be a JSON object")
        client = ModelPolicyClient(
            os.environ["OBP_API_SERVER"], os.environ["OBP_PERIMETER"], headers
        )
        if args.command == "get":
            snapshot = client.get()
            # Exclusive creation protects the original backup from accidental replacement.
            with args.output.open("x") as output:
                json.dump(snapshot, output, indent=2)
                output.write("\n")
            print(f"Saved MODEL_ACCESS policy to {args.output}")
        else:
            result = client.put(json.loads(args.input.read_text()), verify=args.verify)
            outcome = "read-back matched" if args.verify else "accepted by API"
            print(f"Updated MODEL_ACCESS policy ({outcome}); version={result['version']}")
    except KeyError as exc:
        parser.exit(1, f"Missing required environment variable: {exc.args[0]}\n")
    except (PolicyApiError, ValueError, OSError) as exc:
        parser.exit(1, f"{exc}\n")


if __name__ == "__main__":
    main()
