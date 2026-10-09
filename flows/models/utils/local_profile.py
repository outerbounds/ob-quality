"""Resolve policy API settings from the local Outerbounds profile.

Every value the policy client needs is already in the Metaflow config
directory, so a local run does not have to export them by hand:

    OBP_API_SERVER   host of OBP_METAFLOW_CONFIG_URL in config.json
    OBP_PERIMETER    OB_CURRENT_PERIMETER in ob_config.json
    auth headers     METAFLOW_SERVICE_AUTH_KEY in config.json

Environment variables still win, so a run can target a perimeter other than
the active profile. `sources` records where each value came from: a flow that
mutates governance policy should print it rather than silently accept whichever
profile happens to be active.

Only local steps can use this. Remote tasks have no Metaflow config directory;
the platform injects OBP_API_SERVER and OBP_PERIMETER instead.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.parse import urlsplit

# Confirmed against the dev deployment's /v1/perimeters endpoints.
AUTH_HEADER_NAME = "x-api-key"

# A remote task does not reliably receive OBP_API_SERVER, so the deployment is
# identified from whichever host-bearing variable is present. Every endpoint of
# one deployment shares a domain: api./metadata./ui.<deployment>.<suffix>.
DEPLOYMENT_HOST_VARIABLES = (
    "OBP_API_SERVER",
    "METAFLOW_SERVICE_URL",
    "OBP_METAFLOW_CONFIG_URL",
    "METAFLOW_UI_URL",
)


def metaflow_config_dir(environ: dict | None = None) -> Path:
    """Return the Metaflow config directory, honoring METAFLOW_HOME."""
    environ = os.environ if environ is None else environ
    return Path(environ.get("METAFLOW_HOME", "~/.metaflowconfig")).expanduser()


def _read_json(path: Path) -> dict:
    """Read one JSON object, or return empty when the file is absent."""
    if not path.is_file():
        return {}
    try:
        content = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, UnicodeError) as error:
        raise ValueError(f"Unable to read {path}: {error}") from error
    if not isinstance(content, dict):
        raise ValueError(f"Expected a JSON object in {path}")
    return content


def read_profile(environ: dict | None = None) -> dict:
    """Read the active Metaflow profile's config files."""
    environ = os.environ if environ is None else environ
    directory = metaflow_config_dir(environ)
    profile = environ.get("METAFLOW_PROFILE", "").strip()
    name = f"config_{profile}.json" if profile else "config.json"
    return {
        "config": _read_json(directory / name),
        "ob_config": _read_json(directory / "ob_config.json"),
    }


def _perimeter_from_url(config_url: str) -> str:
    """Return the perimeter embedded in a metaflowconfig URL path."""
    parts = [part for part in urlsplit(config_url).path.split("/") if part]
    if "perimeters" in parts:
        index = parts.index("perimeters") + 1
        if index < len(parts):
            return parts[index]
    return ""


def resolve_policy_target(environ: dict | None = None) -> dict:
    """Resolve the server, perimeter, and auth headers for the policy client.

    Returns `server`, `perimeter`, `headers`, and `sources`, where `sources`
    maps each field to "environment" or "profile". Raises ValueError when a
    value is available from neither.
    """
    environ = os.environ if environ is None else environ
    profile = read_profile(environ)
    config = profile["config"]
    config_url = config.get("OBP_METAFLOW_CONFIG_URL", "")
    sources = {}

    server = (environ.get("OBP_API_SERVER") or "").strip()
    if server:
        sources["server"] = "environment"
    else:
        server = urlsplit(config_url).netloc
        sources["server"] = "profile"
    if not server:
        raise ValueError(
            "Set OBP_API_SERVER, or configure an Outerbounds profile with OBP_METAFLOW_CONFIG_URL"
        )

    perimeter = (environ.get("OBP_PERIMETER") or "").strip()
    if perimeter:
        sources["perimeter"] = "environment"
    else:
        perimeter = (profile["ob_config"].get("OB_CURRENT_PERIMETER") or "").strip()
        perimeter = perimeter or _perimeter_from_url(config_url)
        sources["perimeter"] = "profile"
    if not perimeter:
        raise ValueError(
            "Set OBP_PERIMETER, or select a perimeter with `outerbounds perimeter switch`"
        )

    raw_headers = environ.get("MODEL_POLICY_API_HEADERS")
    if raw_headers:
        try:
            headers = json.loads(raw_headers)
        except ValueError as error:
            raise ValueError(f"MODEL_POLICY_API_HEADERS is not valid JSON: {error}") from error
        if not isinstance(headers, dict):
            raise ValueError("MODEL_POLICY_API_HEADERS must be a JSON object")
        sources["headers"] = "environment"
    else:
        auth_key = (config.get("METAFLOW_SERVICE_AUTH_KEY") or "").strip()
        if not auth_key:
            raise ValueError(
                "Set MODEL_POLICY_API_HEADERS, or configure an Outerbounds profile with "
                "METAFLOW_SERVICE_AUTH_KEY"
            )
        headers = {AUTH_HEADER_NAME: auth_key}
        sources["headers"] = "profile"

    return {"server": server, "perimeter": perimeter, "headers": headers, "sources": sources}


def deployment_domain(value: str) -> str:
    """Return the domain shared by every endpoint of one deployment.

    Accepts a hostname or a URL, and drops the leading service label so
    `api.<deployment>.<suffix>` and `metadata.<deployment>.<suffix>` compare
    equal. A bare two-label host is returned unchanged.
    """
    value = (value or "").strip()
    if not value:
        return ""
    netloc = urlsplit(value if "://" in value else f"https://{value}").netloc
    host = netloc.rpartition("@")[2].partition(":")[0].rstrip(".").lower()
    labels = host.split(".")
    return ".".join(labels[1:]) if len(labels) > 2 else host


def task_identity(environ: dict | None = None) -> dict:
    """Identify the deployment and perimeter the current task points at.

    `deployment` is empty when no host-bearing variable is set, which a remote
    task cannot be relied on to provide.
    """
    environ = os.environ if environ is None else environ
    for name in DEPLOYMENT_HOST_VARIABLES:
        domain = deployment_domain(environ.get(name, ""))
        if domain:
            return {
                "deployment": domain,
                "perimeter": (environ.get("OBP_PERIMETER") or "").strip(),
                "source": name,
            }
    return {
        "deployment": "",
        "perimeter": (environ.get("OBP_PERIMETER") or "").strip(),
        "source": "",
    }


def target_mismatch(local: dict, remote: dict) -> str:
    """Describe how two identities disagree, or return an empty string.

    A field the remote task did not report is skipped rather than treated as a
    mismatch, so the check cannot fail merely because the platform does not
    export a variable.
    """
    problems = []
    for field in ("deployment", "perimeter"):
        expected, found = local.get(field, ""), remote.get(field, "")
        if found and expected != found:
            problems.append(f"{field}: local {expected!r}, remote {found!r}")
    return "; ".join(problems)


def describe_target(target: dict) -> str:
    """Describe a resolved target without revealing credential values."""
    sources = target["sources"]
    return (
        f"server={target['server']} ({sources['server']}), "
        f"perimeter={target['perimeter']} ({sources['perimeter']}), "
        f"auth headers={sorted(target['headers'])} ({sources['headers']})"
    )
