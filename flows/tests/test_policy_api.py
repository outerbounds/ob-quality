"""Policy API contract and failure handling without a live perimeter."""

import io
import json
from copy import deepcopy
from email.message import Message
from unittest.mock import Mock
from urllib.error import HTTPError
from urllib.request import HTTPSHandler
from urllib.response import addinfourl

import pytest
from models.utils.policy_api import (
    ConcurrentPolicyChangeError,
    ModelPolicyClient,
    PolicyApiError,
    build_model_access_policy,
    restore_base_policy,
    write_recovery_snapshot,
)

DENY_ALL_SPEC = {"default_action": "deny", "conditions": []}
ALLOW_ALL_SPEC = {"default_action": "allow", "conditions": []}


@pytest.fixture
def snapshot():
    return {
        "version": "123",
        "policy": {
            "kind": "MODEL_ACCESS",
            "status": "enabled",
            "category": "Governance",
            "spec": {"model_access_policy": {"default_action": "deny", "conditions": []}},
        },
    }


@pytest.fixture
def client():
    result = ModelPolicyClient("https://example.test", "default", {"X-Test-Auth": "secret"})
    result.opener = Mock()
    return result


def respond(client, payload):
    client.opener.open.return_value = io.BytesIO(json.dumps(payload).encode())


def test_get_extracts_policy_and_version(client, snapshot):
    respond(client, {"version": "123", "policies": [snapshot["policy"]]})
    assert client.get() == snapshot
    request = client.opener.open.call_args.args[0]
    assert request.full_url == (
        "https://example.test/v1/perimeters/default/policies?kind=MODEL_ACCESS"
    )


def test_put_preserves_version_and_policy(client, snapshot):
    respond(client, {**snapshot, "version": "124"})
    assert client.put(snapshot)["version"] == "124"
    request = client.opener.open.call_args.args[0]
    assert request.method == "PUT"
    assert request.full_url.endswith("/default/policy")
    assert json.loads(request.data) == snapshot


def test_conflict_is_not_retried_or_exposed_as_success(client, snapshot):
    client.opener.open.side_effect = HTTPError("url", 409, "conflict", {}, None)
    with pytest.raises(PolicyApiError, match="HTTP 409.*latest policy"):
        client.put(snapshot)
    assert client.opener.open.call_count == 1


def test_wrong_policy_is_rejected_before_request(client, snapshot):
    snapshot["policy"]["kind"] = "IMAGE_ALLOWLIST"
    with pytest.raises(ValueError, match="MODEL_ACCESS"):
        client.put(snapshot)
    client.opener.open.assert_not_called()


def test_missing_policy_is_not_treated_as_allow(client):
    respond(client, {"version": "123"})
    with pytest.raises(PolicyApiError, match="exactly one"):
        client.get()


def test_invalid_json_response(client):
    client.opener.open.return_value = io.BytesIO(b"<html>Login</html>")
    with pytest.raises(PolicyApiError, match="not valid JSON"):
        client.get()


@pytest.mark.parametrize("server", [" example.test ", "https://example.test/"])
def test_normalizes_server_and_copies_headers(server):
    headers = {"X-Test-Auth": "original"}
    client = ModelPolicyClient(server, "default", headers)
    headers["X-Test-Auth"] = "changed"
    assert client.base_url == "https://example.test/v1/perimeters/default"
    assert client.headers["X-Test-Auth"] == "original"


@pytest.mark.parametrize(
    "server",
    [
        "http://example.test",
        "https://user:password@example.test",
        "example.test/path",
        "example.test?query=yes",
        "example.test#fragment",
        "",
    ],
)
def test_rejects_non_origin_server(server):
    with pytest.raises(ValueError):
        ModelPolicyClient(server, "default", {"X-Test-Auth": "secret"})


def test_rejects_blank_input_version(client, snapshot):
    snapshot["version"] = "  "
    with pytest.raises(ValueError, match="version"):
        client.put(snapshot)
    client.opener.open.assert_not_called()


@pytest.mark.parametrize("method", ["get", "put"])
def test_invalid_response_metadata_is_api_error(client, snapshot, method):
    payload = {"version": " ", "policy": snapshot["policy"]}
    if method == "get":
        payload = {"version": " ", "policies": [snapshot["policy"]]}
    respond(client, payload)
    with pytest.raises(PolicyApiError, match=f"Invalid {method.upper()} policy response"):
        client.get() if method == "get" else client.put(snapshot)


@pytest.mark.parametrize("matches", [True, False])
def test_put_readback(client, snapshot, matches):
    saved_policy = {**snapshot["policy"], "status": "enabled" if matches else "disabled"}
    client.opener.open.side_effect = [
        io.BytesIO(json.dumps({**snapshot, "version": "124"}).encode()),
        io.BytesIO(json.dumps({"version": "125", "policies": [saved_policy]}).encode()),
    ]
    if matches:
        assert client.put(snapshot, verify=True) == {"version": "125", "policy": saved_policy}
    else:
        with pytest.raises(PolicyApiError, match="PUT was accepted, but GET does not match"):
            client.put(snapshot, verify=True)
    assert [call.args[0].method for call in client.opener.open.call_args_list] == ["PUT", "GET"]


def test_readback_failure_reports_write_was_accepted(client, snapshot):
    client.opener.open.side_effect = [
        io.BytesIO(json.dumps(snapshot).encode()),
        HTTPError("url", 403, "forbidden", {}, None),
    ]
    with pytest.raises(PolicyApiError, match="PUT was accepted, but GET verification failed"):
        client.put(snapshot, verify=True)


def test_normalizes_perimeter_whitespace():
    client = ModelPolicyClient("example.test", " default ", {"Authorization": "test-token"})
    assert client.base_url == "https://example.test/v1/perimeters/default"


def test_401_hint_includes_permissions(client):
    client.opener.open.side_effect = HTTPError("url", 401, "unauthorized", {}, None)
    with pytest.raises(PolicyApiError, match="authentication headers and perimeter permissions"):
        client.get()


def test_verification_accepts_server_normalization(client, snapshot):
    snapshot["policy"]["status"] = "disabled"
    snapshot["policy"]["spec"]["model_access_policy"]["conditions"] = [
        {"field": "trainedfor", "operator": "eq", "values": ["TEXT-GENERATION"]}
    ]
    normalized = deepcopy(snapshot["policy"])
    normalized["status"] = "enabled"
    normalized["spec"]["model_access_policy"]["conditions"][0]["values"] = ["text-generation"]
    client.opener.open.side_effect = [
        io.BytesIO(json.dumps({"version": "124", "policy": normalized}).encode()),
        io.BytesIO(json.dumps({"version": "125", "policies": [normalized]}).encode()),
    ]
    assert client.put(snapshot, verify=True) == {"version": "125", "policy": normalized}
    # Verify the differing input was sent; acceptance is based on the server's returned state.
    assert json.loads(client.opener.open.call_args_list[0].args[0].data) == snapshot


def test_built_policy_replaces_only_the_model_access_spec(snapshot):
    """Keep server-managed policy fields while changing model access."""
    original = deepcopy(snapshot["policy"])
    original["spec"]["unrelated_spec"] = {"keep": True}

    blocked = build_model_access_policy(original, DENY_ALL_SPEC)

    assert blocked["spec"]["model_access_policy"] == DENY_ALL_SPEC
    assert blocked["spec"]["unrelated_spec"] == {"keep": True}
    assert blocked["kind"] == "MODEL_ACCESS"
    assert blocked["status"] == original["status"]
    assert blocked["category"] == original["category"]


def test_built_policy_does_not_mutate_the_original_or_the_spec(snapshot):
    """Protect the base snapshot that the flow restores afterwards."""
    original = deepcopy(snapshot["policy"])

    blocked = build_model_access_policy(original, DENY_ALL_SPEC)
    blocked["spec"]["model_access_policy"]["conditions"].append({"field": "injected"})

    assert original == snapshot["policy"]
    assert DENY_ALL_SPEC["conditions"] == []


def test_built_policy_is_accepted_by_snapshot_validation(snapshot):
    """Confirm the generated policy passes the client's pre-request checks."""
    blocked = build_model_access_policy(snapshot["policy"], DENY_ALL_SPEC)

    ModelPolicyClient.validate_snapshot({"version": snapshot["version"], "policy": blocked})


def test_built_policy_round_trips_back_to_the_base_spec(snapshot):
    """Restoring the base policy must reproduce the original spec exactly."""
    base_spec = deepcopy(snapshot["policy"]["spec"]["model_access_policy"])

    blocked = build_model_access_policy(snapshot["policy"], DENY_ALL_SPEC)
    restored = build_model_access_policy(blocked, base_spec)

    assert restored == snapshot["policy"]


@pytest.mark.parametrize("policy", [None, "policy", ["policy"]])
def test_built_policy_rejects_non_object_policy(policy):
    with pytest.raises(ValueError, match="policy object"):
        build_model_access_policy(policy, DENY_ALL_SPEC)


@pytest.mark.parametrize("spec", [None, "deny", ["deny"]])
def test_built_policy_rejects_non_object_spec(snapshot, spec):
    with pytest.raises(ValueError, match="model access spec"):
        build_model_access_policy(snapshot["policy"], spec)


@pytest.fixture
def base_policy(snapshot):
    """An allow-all base policy, as the enforcement flow expects to find."""
    return build_model_access_policy(snapshot["policy"], ALLOW_ALL_SPEC)


@pytest.fixture
def blocked_policy(base_policy):
    return build_model_access_policy(base_policy, DENY_ALL_SPEC)


def test_restore_writes_the_base_policy_back(client, base_policy, blocked_policy):
    """Restore the base policy when the live spec is the one this run applied."""
    client.opener.open.side_effect = [
        io.BytesIO(json.dumps({"version": "124", "policies": [blocked_policy]}).encode()),
        io.BytesIO(json.dumps({"version": "125", "policy": base_policy}).encode()),
        io.BytesIO(json.dumps({"version": "125", "policies": [base_policy]}).encode()),
    ]

    outcome = restore_base_policy(client, base_policy, DENY_ALL_SPEC)

    assert outcome == "restored"
    methods = [call.args[0].method for call in client.opener.open.call_args_list]
    assert methods == ["GET", "PUT", "GET"]
    assert json.loads(client.opener.open.call_args_list[1].args[0].data) == {
        "version": "124",
        "policy": base_policy,
    }


def test_restore_is_a_no_op_when_the_mutation_never_landed(client, base_policy):
    """A failed PUT leaves the base policy live, so nothing must be written."""
    respond(client, {"version": "124", "policies": [base_policy]})

    assert restore_base_policy(client, base_policy, DENY_ALL_SPEC) == "unchanged"
    assert client.opener.open.call_count == 1


def test_restore_refuses_to_overwrite_a_concurrent_change(client, base_policy):
    """Report a third-party edit instead of clobbering it; versions do not protect."""
    other_spec = {"default_action": "allow", "conditions": [{"field": "someone-else"}]}
    other_policy = build_model_access_policy(base_policy, other_spec)
    respond(client, {"version": "999", "policies": [other_policy]})

    with pytest.raises(ConcurrentPolicyChangeError, match="another writer changed it"):
        restore_base_policy(client, base_policy, DENY_ALL_SPEC)
    assert client.opener.open.call_count == 1


def test_restore_detects_a_restore_that_did_not_take(client, base_policy, blocked_policy):
    """A PUT that reports a different spec must not be reported as restored."""
    wrong = build_model_access_policy(base_policy, {"default_action": "deny"})
    client.opener.open.side_effect = [
        io.BytesIO(json.dumps({"version": "124", "policies": [blocked_policy]}).encode()),
        io.BytesIO(json.dumps({"version": "125", "policy": wrong}).encode()),
        io.BytesIO(json.dumps({"version": "125", "policies": [wrong]}).encode()),
    ]

    with pytest.raises(PolicyApiError, match="does not match the base policy"):
        restore_base_policy(client, base_policy, DENY_ALL_SPEC)


def test_recovery_snapshot_is_written_before_mutation(tmp_path, snapshot):
    """The recovery file must survive a process that never runs cleanup."""
    path = write_recovery_snapshot(snapshot, tmp_path)

    assert path.parent == tmp_path
    assert json.loads(path.read_text(encoding="utf-8")) == snapshot


def test_recovery_snapshots_do_not_overwrite_each_other(tmp_path, snapshot):
    first = write_recovery_snapshot(snapshot, tmp_path)
    second = write_recovery_snapshot(snapshot, tmp_path)

    assert first != second
    assert len(list(tmp_path.iterdir())) == 2


def test_recovery_snapshot_rejects_an_invalid_snapshot(tmp_path):
    """Refuse to record a snapshot that could not be restored later."""
    with pytest.raises(ValueError):
        write_recovery_snapshot({"policy": {"kind": "MODEL_ACCESS"}}, tmp_path)
    assert list(tmp_path.iterdir()) == []


@pytest.mark.parametrize("status", [301, 302, 303, 307, 308])
def test_authenticated_redirect_is_blocked(monkeypatch, status):
    requests = []

    def redirect_response(handler, request):
        requests.append(request)
        headers = Message()
        headers["Location"] = "https://other.test/capture"
        response = addinfourl(io.BytesIO(b""), headers, request.full_url, status)
        response.msg = "Redirect"
        return response

    # Keep the real opener and redirect handlers; replace only the network transport.
    monkeypatch.setattr(HTTPSHandler, "https_open", redirect_response)
    client = ModelPolicyClient("example.test", "default", {"Authorization": "test-token"})
    with pytest.raises(PolicyApiError, match=f"HTTP {status}"):
        client.get()
    assert len(requests) == 1
    assert requests[0].get_header("Authorization") == "test-token"
    assert requests[0].full_url.startswith("https://example.test/")
