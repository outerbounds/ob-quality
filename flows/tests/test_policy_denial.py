"""Only configured denial types may count as policy enforcement."""

import pytest
from models.utils.policy_denial import is_policy_denial


class AccessDeniedError(Exception):
    pass


class SpecificAccessDeniedError(AccessDeniedError):
    pass


@pytest.mark.parametrize(
    "error",
    [
        TimeoutError("timed out"),
        ConnectionError("dns failure"),
        FileNotFoundError("missing file"),
        RuntimeError("500 internal server error"),
        OSError("socket closed"),
    ],
)
def test_unrelated_failures_are_not_denials(error):
    """An infrastructure failure must not pass a negative policy test."""
    assert not is_policy_denial(error, ["AccessDeniedError"])


def test_configured_type_is_a_denial():
    assert is_policy_denial(AccessDeniedError("blocked"), ["AccessDeniedError"])


def test_subclass_of_configured_type_is_a_denial():
    """An SDK subclass of a documented denial still counts."""
    assert is_policy_denial(SpecificAccessDeniedError("blocked"), ["AccessDeniedError"])


@pytest.mark.parametrize("names", [(), [], None])
def test_empty_configuration_denies_nothing(names):
    """The default configuration must never classify an exception as a denial."""
    assert not is_policy_denial(AccessDeniedError("blocked"), names or ())


def test_single_string_is_rejected():
    """A bare string would match by character and silently over-accept."""
    with pytest.raises(ValueError, match="not a single string"):
        is_policy_denial(AccessDeniedError("blocked"), "AccessDeniedError")


def test_non_exception_is_rejected():
    with pytest.raises(ValueError, match="Expected an exception"):
        is_policy_denial("AccessDeniedError", ["AccessDeniedError"])
