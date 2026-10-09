"""Model metadata validation, including optimized Python execution."""

import os
import subprocess
import sys
from pathlib import Path

import pytest
from models.utils.model_validators import validate_models


def model_with_size(size):
    return {
        "name": "test-model",
        "license": "test-license",
        "source": {"name": "test-source"},
        "tags": [],
        "quantized_files": [{"size_bytes": size}],
    }


@pytest.mark.parametrize("size", [None, 0, 1, 1.5, 10**400])
def test_empty_tags_and_valid_sizes(size):
    validate_models([model_with_size(size)])


@pytest.mark.parametrize("size", [float("inf"), float("-inf"), float("nan"), -1, True, "1"])
def test_rejects_invalid_sizes(size):
    with pytest.raises(ValueError, match="size_bytes"):
        validate_models([model_with_size(size)])


@pytest.mark.parametrize("tags", [None, "tag", [None], [{}], [{"name": " "}]])
def test_rejects_malformed_tags(tags):
    model = model_with_size(0)
    model["tags"] = tags
    with pytest.raises(ValueError, match="tags"):
        validate_models([model])


def test_validation_still_runs_with_optimization():
    result = subprocess.run(
        [
            sys.executable,
            "-O",
            "-c",
            "from models.utils.model_validators import validate_models; validate_models([{}])",
        ],
        env={**os.environ, "PYTHONPATH": str(Path(__file__).resolve().parents[1])},
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode != 0
    assert "ValueError: Model at index 0: missing required field 'name'" in result.stderr
