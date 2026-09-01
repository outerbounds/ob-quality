"""Reusable validation for model catalog metadata."""

from collections.abc import Mapping, Sequence
from typing import Any


def validate_non_empty_string(value: Any, field_name: str, context: str) -> None:
    """Validate that a value is a non-empty string."""
    assert isinstance(value, str), (
        f"{context}: field '{field_name}' must be a string; "
        f"got {type(value).__name__}: {value!r}"
    )
    assert value.strip(), (
        f"{context}: field '{field_name}' must contain non-whitespace text; "
        f"got {value!r}"
    )


def validate_model(model: Mapping[str, Any], index: int) -> None:
    """Validate one model metadata object."""
    context = f"Model at index {index}"
    assert isinstance(model, Mapping), (
        f"{context}: expected a mapping, got {type(model).__name__}: {model!r}"
    )

    for field_name in ("name", "license", "source", "tags"):
        assert field_name in model, (
            f"{context}: missing required field '{field_name}'"
        )

    for field_name in ("name", "license"):
        validate_non_empty_string(model[field_name], field_name, context)

    source = model["source"]
    assert isinstance(source, Mapping), (
        f"{context}: field 'source' must be an object; "
        f"got {type(source).__name__}: {source!r}"
    )
    assert "name" in source, f"{context}: missing required field 'source.name'"
    validate_non_empty_string(source["name"], "source.name", context)

    tags = model["tags"]
    assert isinstance(tags, list), (
        f"{context}: field 'tags' must be a list of objects; "
        f"got {type(tags).__name__}: {tags!r}"
    )
    assert tags, f"{context}: field 'tags' must not be empty; got {tags!r}"
    for tag_index, tag in enumerate(tags):
        assert isinstance(tag, Mapping), (
            f"{context}: field 'tags[{tag_index}]' must be an object; "
            f"got {type(tag).__name__}: {tag!r}"
        )
        assert "name" in tag, (
            f"{context}: missing required field 'tags[{tag_index}].name'"
        )
        validate_non_empty_string(
            tag["name"], f"tags[{tag_index}].name", context
        )

    if "quantized_files" in model:
        quantized_files = model["quantized_files"]
        assert isinstance(quantized_files, list), (
            f"{context}: field 'quantized_files' must be a list; "
            f"got {type(quantized_files).__name__}: {quantized_files!r}"
        )
        for file_index, file_info in enumerate(quantized_files):
            file_context = f"{context}, quantized file at index {file_index}"
            assert isinstance(file_info, Mapping), (
                f"{file_context}: expected an object, "
                f"got {type(file_info).__name__}: {file_info!r}"
            )
            size_bytes = file_info.get("size_bytes")
            if size_bytes is not None:
                assert isinstance(size_bytes, (int, float)) and not isinstance(
                    size_bytes, bool
                ), (
                    f"{file_context}: field 'size_bytes' must be numeric, "
                    f"not boolean; got {type(size_bytes).__name__}: {size_bytes!r}"
                )
                assert size_bytes >= 0, (
                    f"{file_context}: field 'size_bytes' must be at least zero; "
                    f"got {size_bytes!r}"
                )


def validate_models(models: Sequence[Mapping[str, Any]]) -> None:
    """Validate a sequence of model metadata objects."""
    assert isinstance(models, Sequence) and not isinstance(models, (str, bytes)), (
        f"Expected a sequence of models, got {type(models).__name__}: {models!r}"
    )
    for index, model in enumerate(models):
        validate_model(model, index)
