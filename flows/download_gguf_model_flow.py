"""Download and validate a GGUF model from the catalog.

Run with:
    python flows/download_gguf_model_flow.py --environment=fast-bakery run --with kubernetes
"""

import os

from metaflow import FlowSpec, anaconda_models, step

from testdata.model_catalog_data import GGUF_MODEL


class DownloadGgufModelFlow(FlowSpec):
    @anaconda_models
    @step
    def start(self):
        model = self.anaconda_models.model(
            GGUF_MODEL["name"],
            format=GGUF_MODEL["format"],
            quant_method=GGUF_MODEL["quant_method"],
        )

        assert model is not None, "Expected a model handle"
        assert model.name == GGUF_MODEL["name"], (
            f"Expected model {GGUF_MODEL['name']}, got {model.name}"
        )
        assert not hasattr(model, "access_denied_reason"), (
            f"Model access was denied: {model.name}"
        )
        assert model.format == GGUF_MODEL["format"], (
            f"Expected format {GGUF_MODEL['format']}, got {model.format}"
        )
        assert model.quant_method == GGUF_MODEL["quant_method"], (
            f"Expected quantization {GGUF_MODEL['quant_method']}, "
            f"got {model.quant_method}"
        )
        pulled_path = model.pull()

        assert pulled_path == model.path, (
            f"Expected pull to return {model.path}, got {pulled_path}"
        )
        assert model.download_status in ("downloaded", "skipped"), (
            f"Unexpected download status: {model.download_status}"
        )
        assert isinstance(pulled_path, str) and pulled_path.strip(), (
            f"Expected a non-empty model path, got {pulled_path!r}"
        )
        assert os.path.isfile(pulled_path), (
            f"Downloaded model file does not exist: {pulled_path}"
        )
        assert os.access(pulled_path, os.R_OK), (
            f"Downloaded model file is not readable: {pulled_path}"
        )

        file_size = os.path.getsize(pulled_path)
        assert file_size > 0, f"Downloaded model file is empty: {pulled_path}"

        minimum_size = GGUF_MODEL["minimum_size_mb"] * 1_000_000
        assert file_size >= minimum_size, (
            f"Expected model size of at least {GGUF_MODEL['minimum_size_mb']} MB, "
            f"got {file_size} bytes"
        )
        assert os.path.basename(pulled_path).lower().endswith(".gguf"), (
            f"Expected a .gguf filename, got {pulled_path}"
        )

        print(
            f"Validated GGUF download: {model.name} "
            f"({file_size} bytes, status={model.download_status})"
        )

        self.next(self.end)

    @step
    def end(self):
        print("GGUF MODEL DOWNLOAD FLOW PASSED")


if __name__ == "__main__":
    DownloadGgufModelFlow()
