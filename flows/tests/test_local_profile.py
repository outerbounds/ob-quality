"""Resolve policy settings from the local profile without reaching the network."""

import json

import pytest
from models.utils.local_profile import (
    AUTH_HEADER_NAME,
    deployment_domain,
    describe_target,
    resolve_policy_target,
    target_mismatch,
    task_identity,
)

CONFIG_URL = "https://api.dev-example.outerbounds.xyz/v1/perimeters/default/metaflowconfigs/default"


@pytest.fixture
def profile(tmp_path):
    """Write a thin OBP profile like `outerbounds configure` produces."""
    (tmp_path / "config.json").write_text(
        json.dumps({"OBP_METAFLOW_CONFIG_URL": CONFIG_URL, "METAFLOW_SERVICE_AUTH_KEY": "token"}),
        encoding="utf-8",
    )
    (tmp_path / "ob_config.json").write_text(
        json.dumps({"OB_CURRENT_PERIMETER": "default"}), encoding="utf-8"
    )
    return {"METAFLOW_HOME": str(tmp_path)}


def test_resolves_every_value_from_the_profile(profile):
    """A configured profile needs no exported variables."""
    target = resolve_policy_target(profile)

    assert target["server"] == "api.dev-example.outerbounds.xyz"
    assert target["perimeter"] == "default"
    assert target["headers"] == {AUTH_HEADER_NAME: "token"}
    assert set(target["sources"].values()) == {"profile"}


@pytest.mark.parametrize(
    ("variable", "value", "field", "expected"),
    [
        ("OBP_API_SERVER", "api.other.test", "server", "api.other.test"),
        ("OBP_PERIMETER", "staging", "perimeter", "staging"),
    ],
)
def test_environment_overrides_the_profile(profile, variable, value, field, expected):
    """An explicit variable must win so a run can target another perimeter."""
    target = resolve_policy_target({**profile, variable: value})

    assert target[field] == expected
    assert target["sources"][field] == "environment"


def test_environment_headers_override_the_profile_token(profile):
    headers = {"Authorization": "Bearer other"}
    target = resolve_policy_target({**profile, "MODEL_POLICY_API_HEADERS": json.dumps(headers)})

    assert target["headers"] == headers
    assert target["sources"]["headers"] == "environment"


def test_blank_environment_values_fall_back_to_the_profile(profile):
    """A cleared export must not resolve to an empty perimeter."""
    target = resolve_policy_target({**profile, "OBP_PERIMETER": "   "})

    assert target["perimeter"] == "default"
    assert target["sources"]["perimeter"] == "profile"


def test_named_profile_is_selected(tmp_path, profile):
    """METAFLOW_PROFILE selects config_<profile>.json, as Metaflow does."""
    (tmp_path / "config_staging.json").write_text(
        json.dumps(
            {
                "OBP_METAFLOW_CONFIG_URL": CONFIG_URL.replace("dev-example", "staging-example"),
                "METAFLOW_SERVICE_AUTH_KEY": "staging-token",
            }
        ),
        encoding="utf-8",
    )

    target = resolve_policy_target({**profile, "METAFLOW_PROFILE": "staging"})

    assert target["server"] == "api.staging-example.outerbounds.xyz"
    assert target["headers"] == {AUTH_HEADER_NAME: "staging-token"}


def test_perimeter_falls_back_to_the_config_url(tmp_path, profile):
    """A missing ob_config.json still yields the perimeter from the URL path."""
    (tmp_path / "ob_config.json").unlink()

    assert resolve_policy_target(profile)["perimeter"] == "default"


@pytest.mark.parametrize(
    ("missing_key", "message"),
    [
        ("OBP_METAFLOW_CONFIG_URL", "OBP_API_SERVER"),
        ("METAFLOW_SERVICE_AUTH_KEY", "MODEL_POLICY_API_HEADERS"),
    ],
)
def test_missing_profile_values_name_the_variable_to_set(tmp_path, profile, missing_key, message):
    """An unconfigured profile must say which variable to export."""
    config = json.loads((tmp_path / "config.json").read_text(encoding="utf-8"))
    del config[missing_key]
    (tmp_path / "config.json").write_text(json.dumps(config), encoding="utf-8")

    with pytest.raises(ValueError, match=message):
        resolve_policy_target(profile)


def test_absent_profile_directory_is_reported(tmp_path):
    with pytest.raises(ValueError, match="OBP_API_SERVER"):
        resolve_policy_target({"METAFLOW_HOME": str(tmp_path / "missing")})


def test_malformed_profile_is_reported(tmp_path):
    (tmp_path / "config.json").write_text("<html>Login</html>", encoding="utf-8")

    with pytest.raises(ValueError, match="Unable to read"):
        resolve_policy_target({"METAFLOW_HOME": str(tmp_path)})


def test_invalid_environment_headers_are_reported(profile):
    with pytest.raises(ValueError, match="not valid JSON"):
        resolve_policy_target({**profile, "MODEL_POLICY_API_HEADERS": "not-json"})


@pytest.mark.parametrize(
    "value",
    [
        "api.dev-coldbrewcrew.outerbounds.xyz",
        "https://api.dev-coldbrewcrew.outerbounds.xyz",
        "https://metadata.dev-coldbrewcrew.outerbounds.xyz/p/default/",
        "https://ui.dev-coldbrewcrew.outerbounds.xyz/p/default/",
        "https://api.dev-coldbrewcrew.outerbounds.xyz:443/v1/perimeters/default",
        "API.DEV-COLDBREWCREW.OUTERBOUNDS.XYZ.",
    ],
)
def test_every_endpoint_of_one_deployment_shares_a_domain(value):
    """api./metadata./ui. hosts must compare equal across local and remote."""
    assert deployment_domain(value) == "dev-coldbrewcrew.outerbounds.xyz"


@pytest.mark.parametrize("value", ["", "   ", None])
def test_deployment_domain_of_nothing_is_empty(value):
    assert deployment_domain(value) == ""


def test_short_host_is_kept_whole():
    """A two-label host has no service prefix to drop."""
    assert deployment_domain("example.test") == "example.test"


def test_task_identity_prefers_the_api_server():
    identity = task_identity(
        {
            "OBP_API_SERVER": "api.dev-example.outerbounds.xyz",
            "METAFLOW_SERVICE_URL": "https://metadata.other.outerbounds.xyz/p/default/",
            "OBP_PERIMETER": "default",
        }
    )

    assert identity == {
        "deployment": "dev-example.outerbounds.xyz",
        "perimeter": "default",
        "source": "OBP_API_SERVER",
    }


def test_task_identity_falls_back_when_the_api_server_is_absent():
    """The observed remote task sets METAFLOW_SERVICE_URL but not OBP_API_SERVER."""
    identity = task_identity(
        {
            "OBP_API_SERVER": "",
            "METAFLOW_SERVICE_URL": "https://metadata.dev-coldbrewcrew.outerbounds.xyz/p/default/",
            "OBP_PERIMETER": "default",
        }
    )

    assert identity["deployment"] == "dev-coldbrewcrew.outerbounds.xyz"
    assert identity["source"] == "METAFLOW_SERVICE_URL"


def test_task_identity_without_any_host_is_reported_as_unknown():
    identity = task_identity({"OBP_PERIMETER": "default"})

    assert identity["deployment"] == ""
    assert identity["perimeter"] == "default"


def test_matching_identities_report_no_mismatch():
    local = {"deployment": "dev-example.outerbounds.xyz", "perimeter": "default"}
    remote = {"deployment": "dev-example.outerbounds.xyz", "perimeter": "default"}

    assert target_mismatch(local, remote) == ""


def test_an_unreported_remote_host_is_not_a_mismatch():
    """Reproduces the failure where the task exported no OBP_API_SERVER."""
    local = {"deployment": "dev-coldbrewcrew.outerbounds.xyz", "perimeter": "default"}
    remote = {"deployment": "", "perimeter": "default"}

    assert target_mismatch(local, remote) == ""


@pytest.mark.parametrize(
    ("field", "value"),
    [("deployment", "prod.outerbounds.xyz"), ("perimeter", "production")],
)
def test_a_real_disagreement_is_reported(field, value):
    """A perimeter or deployment the task actually reports must still block."""
    local = {"deployment": "dev-example.outerbounds.xyz", "perimeter": "default"}

    assert field in target_mismatch(local, {**local, field: value})


def test_description_names_headers_without_revealing_values(profile):
    """A printed target must not leak the token into flow logs."""
    description = describe_target(resolve_policy_target(profile))

    assert "token" not in description
    assert AUTH_HEADER_NAME in description
    assert "api.dev-example.outerbounds.xyz (profile)" in description
