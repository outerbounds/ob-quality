"""Download and validate a Safetensors collection from the catalog.

Run with:
    python flows/download_safetensors_model_flow.py --environment=fast-bakery run --with kubernetes
"""

import os

from metaflow import FlowSpec, anaconda_models, step

from testdata.model_catalog_data import SAFETENSORS_MODEL


class DownloadSafetensorsModelFlow(FlowSpec):
    @anaconda_models
    @step
    def start(self):
        model = self.anaconda_models.model(
            SAFETENSORS_MODEL["name"],
            format=SAFETENSORS_MODEL["format"],
            pull=True,
        )

        assert model is not None, "Expected a model handle"
        assert model.name == SAFETENSORS_MODEL["name"], (
            f"Expected model {SAFETENSORS_MODEL['name']}, got {model.name}"
        )
        assert model.is_collection, "Expected a Safetensors collection"
        assert model.format == SAFETENSORS_MODEL["format"], (
            f"Expected format {SAFETENSORS_MODEL['format']}, got {model.format}"
        )
        assert model.download_status in ("downloaded", "skipped"), (
            f"Unexpected download status: {model.download_status}"
        )
        assert isinstance(model.path, str) and model.path.strip(), (
            f"Expected a non-empty collection path, got {model.path!r}"
        )
        assert os.path.isdir(model.path), (
            f"Collection directory does not exist: {model.path}"
        )
        assert os.access(model.path, os.R_OK), (
            f"Collection directory is not readable: {model.path}"
        )
        assert isinstance(model.files, list) and model.files, (
            "Expected a non-empty list of collection files"
        )
        assert len(model.files) >= SAFETENSORS_MODEL["minimum_file_count"], (
            f"Expected at least {SAFETENSORS_MODEL['minimum_file_count']} files, "
            f"got {len(model.files)}"
        )

        collection_path = os.path.realpath(model.path)
        filenames = []
        total_size = 0

        for file_info in model.files:
            assert isinstance(file_info, dict), (
                f"Expected each file entry to be a dictionary, got "
                f"{type(file_info).__name__}"
            )

            filename = file_info.get("filename")
            assert isinstance(filename, str) and filename.strip(), (
                f"Expected a non-empty filename, got {filename!r}"
            )

            file_path = os.path.realpath(os.path.join(collection_path, filename))
            assert os.path.commonpath([collection_path, file_path]) == collection_path, (
                f"Collection file resolves outside its directory: {filename}"
            )
            assert os.path.isfile(file_path), f"Missing collection file: {filename}"
            assert os.access(file_path, os.R_OK), (
                f"Collection file is not readable: {filename}"
            )

            actual_size = os.path.getsize(file_path)
            assert actual_size > 0, f"Collection file is empty: {filename}"

            expected_size = file_info.get("size_bytes")
            if expected_size is not None:
                assert actual_size == expected_size, (
                    f"Size mismatch for {filename}: "
                    f"expected {expected_size}, got {actual_size}"
                )

            filenames.append(filename)
            total_size += actual_size

        assert len(filenames) == len(set(filenames)), (
            f"Expected unique filenames, got {filenames}"
        )
        assert total_size > 0, "Expected total collection size to be greater than zero"

        print(f"Downloaded collection: {model.name}")
        print(f"Path: {model.path}")
        print(f"Files: {len(model.files)}")
        print(f"Total size: {total_size} bytes")

        self.next(self.end)

    @step
    def end(self):
        print("SAFETENSORS MODEL DOWNLOAD FLOW PASSED")


if __name__ == "__main__":
    DownloadSafetensorsModelFlow()
