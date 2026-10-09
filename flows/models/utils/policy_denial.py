"""Decide whether a model SDK error is a policy denial.

A negative policy test must not accept any failure as proof of enforcement: a
DNS failure, timeout, missing file, or server error would otherwise pass the
test. Denials are matched by exception type name against an explicit list, so
an unrecognized error is re-raised by the caller rather than counted.

The configured list is empty by default, which means no exception counts as a
denial. Populate it only with the SDK's documented policy-denial type once
that type is confirmed against the deployed SDK.
"""

from __future__ import annotations

from collections.abc import Sequence


def is_policy_denial(error: BaseException, denial_error_names: Sequence[str]) -> bool:
    """Return True when `error`'s type or a base type is a configured denial."""
    if not isinstance(error, BaseException):
        raise ValueError(f"Expected an exception, got {type(error).__name__}: {error!r}")
    if isinstance(denial_error_names, str):
        raise ValueError("Expected a sequence of type names, not a single string")
    names = set(denial_error_names)
    if not names:
        return False
    # Match base types too, so an SDK subclass of a documented denial counts.
    return any(klass.__name__ in names for klass in type(error).__mro__)
