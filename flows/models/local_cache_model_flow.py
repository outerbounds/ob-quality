"""Validate the task-local cache used by ``@anaconda_models``.

The first pull downloads a model into a clean, fixed directory in the task.
The second pull resolves a new model handle against the same directory and
must reuse the existing file instead of downloading it again. This validates
reuse within one Metaflow task/process, not between separate tasks or pods.

Run from the flows directory with:
    python models/local_cache_model_flow.py --environment=fast-bakery run --with kubernetes
"""

import os
import shutil

from metaflow import FlowSpec, anaconda_models, step

from testdata.model_catalog_data import GGUF_MODEL

CACHE_ROOT = "/tmp/obp-anaconda-model-local-cache-test"


class LocalCacheModelFlow(FlowSpec):
    @anaconda_models(temp_dir_root=CACHE_ROOT)
    @step
    def start(self):
        # Ensure the first pull is a cache miss, including on task retries.
        if os.path.exists(CACHE_ROOT):
            shutil.rmtree(CACHE_ROOT)
        assert not os.path.exists(CACHE_ROOT), (
            f"Expected cache root to be removed: {CACHE_ROOT}"
        )

        cold_model = self.anaconda_models.model(
            GGUF_MODEL["name"],
            format=GGUF_MODEL["format"],
            quant_method=GGUF_MODEL["quant_method"],
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

        cold_model.pull()

        assert cold_model.download_status == "downloaded", (
            f"Expected first pull to download the model, got "
            f"{cold_model.download_status!r}"
        )
        assert os.path.isfile(cold_model.path), (
            f"Downloaded model is missing: {cold_model.path}"
        )
        assert cold_model.files, "Cold pull did not report any model files"
        for file_info in cold_model.files:
            assert file_info["status"] == "downloaded", (
                f"Expected downloaded file status 'downloaded', got {file_info['status']!r}"
            )

        cold_path = cold_model.path
        cold_size = os.path.getsize(cold_path)
        assert cold_size == cold_model.size, (
            f"Downloaded size mismatch: expected {cold_model.size}, got {cold_size}"
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

        warm_model.pull()

        assert warm_model.path == cold_path, (
            f"Expected warm model path {cold_path}, got {warm_model.path}"
        )
        assert warm_model.download_status == "skipped", (
            f"Expected second pull to hit the local cache, got "
            f"{warm_model.download_status!r}"
        )
        assert warm_model.files, "Warm pull did not report any model files"
        assert len(warm_model.files) == len(cold_model.files), (
            f"Expected {len(cold_model.files)} cached files, got {len(warm_model.files)}"
        )
        for file_info in warm_model.files:
            assert file_info["status"] == "skipped", (
                f"Expected cached file status 'skipped', got {file_info['status']!r}"
            )

        warm_stat = os.stat(warm_model.path)
        assert warm_stat.st_size == cold_size, (
            "Expected cached file size to match the original download"
        )
        assert warm_stat.st_ino == cold_stat.st_ino, (
            "Warm pull replaced the cached file instead of reusing it"
        )
        assert warm_stat.st_mtime_ns == cold_stat.st_mtime_ns, (
            "Warm pull modified the cached file instead of reusing it"
        )

        print(f"Cold pull: downloaded {cold_path} ({cold_size} bytes)")
        print("Warm pull: reused the task-local cached model")

        self.next(self.end)

    @step
    def end(self):
        print("LOCAL CACHE MODEL FLOW PASSED")


if __name__ == "__main__":
    LocalCacheModelFlow()
