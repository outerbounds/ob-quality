"""
E2E test flow for the anaconda_models decorator on a real cluster.

The target environment must inject OBP_API_SERVER, OBP_PERIMETER, and
METAFLOW_SERVICE_HEADERS into task pods. The deny test also expects a policy
that blocks Llama models.
"""

import os

from metaflow import FlowSpec, anaconda_models, step


class TestAnacondaModelsFlow(FlowSpec):
    @anaconda_models
    @step
    def start(self):
        models = self.anaconda_models.list_models(limit=5)
        assert len(models) > 0, "Expected at least 1 model from browse"
        print(f"Browse: got {len(models)} models")
        for model in models:
            print(f"  - {model['name']}")

        self.next(self.pull_model)

    @anaconda_models
    @step
    def pull_model(self):
        model = self.anaconda_models.model(
            "Qwen2.5-0.5B", format="gguf", quant_method="q4_k_m"
        )
        model.pull()
        assert model.format == "gguf"
        assert model.quant_method == "q4_k_m"

        assert model.download_status == "downloaded"
        assert os.path.exists(model.path)
        size_mb = os.path.getsize(model.path) / 1e6
        assert size_mb > 50, f"File too small: {size_mb:.1f} MB"
        print(f"Pull: {model.name} -> {model.path} ({size_mb:.0f} MB)")

        self.next(self.pull_collection)

    @anaconda_models
    @step
    def pull_collection(self):
        collection = self.anaconda_models.model(
            "gpt2", format="safetensors", pull=True
        )

        assert collection.is_collection, "Expected a safetensor collection handle"
        assert collection.download_status in ("downloaded", "skipped"), (
            "Unexpected status: %s" % collection.download_status
        )
        assert collection.format == "safetensors"
        assert len(collection.files) > 0, "Expected at least 1 file in collection"
        assert os.path.isdir(collection.path), (
            "Collection dir does not exist: %s" % collection.path
        )

        for file_info in collection.files:
            file_path = os.path.join(collection.path, file_info["filename"])
            assert os.path.exists(file_path), "Missing file: %s" % file_info["filename"]
            if file_info["size_bytes"]:
                actual_size = os.path.getsize(file_path)
                assert actual_size == file_info["size_bytes"], (
                    "Size mismatch for %s: expected %d, got %d"
                    % (
                        file_info["filename"],
                        file_info["size_bytes"],
                        actual_size,
                    )
                )

        print(f"Collection: {collection.name} -> {collection.path}")
        print(
            f"  Format: {collection.format}, Type: {collection.collection_type}"
        )
        print(
            f"  Files: {len(collection.files)}, "
            f"Total: {(collection.size or 0) >> 20} MB"
        )
        for file_info in collection.files[:5]:
            print(
                f"    {file_info['filename']} "
                f"({(file_info['size_bytes'] or 0) >> 20} MB) "
                f"[{file_info['status']}]"
            )
        if len(collection.files) > 5:
            print(f"    ... and {len(collection.files) - 5} more")

        self.next(self.test_deny)

    @anaconda_models
    @step
    def test_deny(self):
        model = self.anaconda_models.model("Llama-3.2-1B")
        assert hasattr(model, "access_denied_reason"), (
            "Expected _DeniedModel but got: %s" % type(model).__name__
        )
        assert model.access_denied_reason is not None
        print(f"Deny: correctly blocked - {model.name}: {model.access_denied_reason}")

        self.next(self.end)

    @step
    def end(self):
        print("ALL E2E TESTS PASSED")


if __name__ == "__main__":
    TestAnacondaModelsFlow()