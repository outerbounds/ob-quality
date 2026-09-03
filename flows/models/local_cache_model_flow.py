"""Validate the task-local cache used by ``@anaconda_models``.

The first pull downloads a model into a clean, unique directory in the task.
The second pull resolves a new model handle against the same directory and
must reuse the existing file instead of downloading it again. This validates
reuse within one Metaflow task/process, not between separate tasks or pods.

Run from the flows directory with:
    python models/local_cache_model_flow.py --environment=fast-bakery run --with kubernetes
"""

import os
import shutil
import tempfile
import uuid

from metaflow import FlowSpec, anaconda_models, step

from testdata.model_catalog_data import GGUF_MODEL

CACHE_ROOT = os.path.join(
    tempfile.gettempdir(),
    f"obp-anaconda-model-local-cache-test-{uuid.uuid4().hex}",
)


class LocalCacheModelFlow(FlowSpec):
    @anaconda_models(temp_dir_root=CACHE_ROOT)
    @step
    def start(self):
        try:
            cold_model = self.anaconda_models.model(
                GGUF_MODEL["name"],
                format=GGUF_MODEL["format"],
                quant_method=GGUF_MODEL["quant_method"],
            )
            access_denied_reason = getattr(
                cold_model, "access_denied_reason", None
            )
            assert not access_denied_reason, (
                f"Model access was denied: {access_denied_reason}"
            )
            assert cold_model.name == GGUF_MODEL["name"], (
                f"Expected model {GGUF_MODEL['name']}, got {cold_model.name}"
            )
            assert cold_model.format == GGUF_MODEL["format"], (
                f"Expected format {GGUF_MODEL['format']}, got {cold_model.format}"
            )
            assert cold_model.quant_method == GGUF_MODEL["quant_method"], (
                f"Expected quantization {GGUF_MODEL['quant_method']}, "
                f"got {cold_model.quant_method}"
            )
            assert not cold_model.is_collection, "Expected a single-file model"

            cache_root = os.path.realpath(CACHE_ROOT)
            expected_path = os.path.realpath(cold_model.path)
            assert os.path.commonpath([cache_root, expected_path]) == cache_root, (
                f"Expected model path under {cache_root}, got {expected_path}"
            )
            assert not os.path.exists(expected_path), (
                f"Expected an empty cache, but model already exists: {expected_path}"
            )

            cold_model.pull()

            cold_path = os.path.realpath(cold_model.path)
            assert cold_path == expected_path, (
                f"Model path changed after pull: expected {expected_path}, "
                f"got {cold_path}"
            )
            assert cold_model.download_status == "downloaded", (
                f"Expected first pull to download the model, got "
                f"{cold_model.download_status!r}"
            )
            assert os.path.isfile(cold_path), (
                f"Downloaded model is missing: {cold_path}"
            )
            assert cold_model.files, "Cold pull did not report any model files"
            for file_info in cold_model.files:
                assert file_info["status"] == "downloaded", (
                    "Expected downloaded file status 'downloaded', got "
                    f"{file_info['status']!r}"
                )

            cold_size = os.path.getsize(cold_path)
            assert cold_size > 0, f"Downloaded model file is empty: {cold_path}"
            minimum_size = GGUF_MODEL["minimum_size_mb"] * 1_000_000
            assert cold_size >= minimum_size, (
                f"Expected model size of at least "
                f"{GGUF_MODEL['minimum_size_mb']} MB, got {cold_size} bytes"
            )
            cold_stat = os.stat(cold_path)

            # Use a new model handle to prove reuse comes from task-local storage,
            # rather than from state retained by the first handle.
            warm_model = self.anaconda_models.model(
                GGUF_MODEL["name"],
                format=GGUF_MODEL["format"],
                quant_method=GGUF_MODEL["quant_method"],
            )
            assert warm_model is not cold_model, "Expected a new model handle"
            access_denied_reason = getattr(
                warm_model, "access_denied_reason", None
            )
            assert not access_denied_reason, (
                f"Model access was denied: {access_denied_reason}"
            )

            warm_model.pull()

            warm_path = os.path.realpath(warm_model.path)
            assert warm_path == cold_path, (
                f"Expected warm model path {cold_path}, got {warm_path}"
            )
            assert warm_model.download_status == "skipped", (
                f"Expected second pull to hit the local cache, got "
                f"{warm_model.download_status!r}"
            )
            assert warm_model.files, "Warm pull did not report any model files"
            assert len(warm_model.files) == len(cold_model.files), (
                f"Expected {len(cold_model.files)} cached files, got "
                f"{len(warm_model.files)}"
            )
            for file_info in warm_model.files:
                assert file_info["status"] == "skipped", (
                    f"Expected cached file status 'skipped', got "
                    f"{file_info['status']!r}"
                )

            warm_stat = os.stat(warm_path)
            assert warm_stat.st_size == cold_size, (
                "Expected cached file size to match the original download"
            )
            assert warm_stat.st_mtime_ns == cold_stat.st_mtime_ns, (
                "Warm pull modified the cached file instead of reusing it"
            )

            print(f"Cold pull: downloaded {cold_path} ({cold_size} bytes)")
            print("Warm pull: reused the task-local cached model")
        finally:
            shutil.rmtree(CACHE_ROOT, ignore_errors=True)

        self.next(self.end)

    @step
    def end(self):
        print("LOCAL CACHE MODEL FLOW PASSED")


if __name__ == "__main__":
    LocalCacheModelFlow()
