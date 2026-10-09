"""Reusable validation for model catalog metadata."""

import math
from collections.abc import Mapping, Sequence
from typing import Any


def validate_non_empty_string(value: Any, field_name: str, context: str) -> None:
    """Validate that a value is a non-empty string."""
    if not isinstance(value, str):
        raise ValueError(
            f"{context}: field '{field_name}' must be a string; "
            f"got {type(value).__name__}: {value!r}"
        )
    if not value.strip():
        raise ValueError(
            f"{context}: field '{field_name}' must contain non-whitespace text; got {value!r}"
        )


def validate_model(model: Mapping[str, Any], index: int) -> None:
    """Validate one model metadata object."""
    context = f"Model at index {index}"
    if not isinstance(model, Mapping):
        raise ValueError(f"{context}: expected a mapping, got {type(model).__name__}: {model!r}")

    for field_name in ("name", "license", "source", "tags"):
        if field_name not in model:
            raise ValueError(f"{context}: missing required field '{field_name}'")

    for field_name in ("name", "license"):
        validate_non_empty_string(model[field_name], field_name, context)

    source = model["source"]
    if not isinstance(source, Mapping):
        raise ValueError(
            f"{context}: field 'source' must be an object; got {type(source).__name__}: {source!r}"
        )
    if "name" not in source:
        raise ValueError(f"{context}: missing required field 'source.name'")
    validate_non_empty_string(source["name"], "source.name", context)

    tags = model["tags"]
    if not isinstance(tags, list):
        raise ValueError(
            f"{context}: field 'tags' must be a list of objects; "
            f"got {type(tags).__name__}: {tags!r}"
        )
    for tag_index, tag in enumerate(tags):
        if not isinstance(tag, Mapping):
            raise ValueError(
                f"{context}: field 'tags[{tag_index}]' must be an object; "
                f"got {type(tag).__name__}: {tag!r}"
            )
        if "name" not in tag:
            raise ValueError(f"{context}: missing required field 'tags[{tag_index}].name'")
        validate_non_empty_string(tag["name"], f"tags[{tag_index}].name", context)

    if "quantized_files" in model:
        quantized_files = model["quantized_files"]
        if not isinstance(quantized_files, list):
            raise ValueError(
                f"{context}: field 'quantized_files' must be a list; "
                f"got {type(quantized_files).__name__}: {quantized_files!r}"
            )
        for file_index, file_info in enumerate(quantized_files):
            file_context = f"{context}, quantized file at index {file_index}"
            if not isinstance(file_info, Mapping):
                raise ValueError(
                    f"{file_context}: expected an object, "
                    f"got {type(file_info).__name__}: {file_info!r}"
                )
            size_bytes = file_info.get("size_bytes")
            if size_bytes is not None:
                if not isinstance(size_bytes, (int, float)) or isinstance(size_bytes, bool):
                    raise ValueError(
                        f"{file_context}: field 'size_bytes' must be numeric, "
                        f"not boolean; got {type(size_bytes).__name__}: {size_bytes!r}"
                    )
                if size_bytes < 0 or (
                    isinstance(size_bytes, float) and not math.isfinite(size_bytes)
                ):
                    raise ValueError(
                        f"{file_context}: field 'size_bytes' must be finite and at least zero; "
                        f"got {size_bytes!r}"
                    )


def validate_models(models: Sequence[Mapping[str, Any]]) -> None:
    """Validate a sequence of model metadata objects."""
    if not isinstance(models, Sequence) or isinstance(models, (str, bytes)):
        raise ValueError(f"Expected a sequence of models, got {type(models).__name__}: {models!r}")
    for index, model in enumerate(models):
        validate_model(model, index)
