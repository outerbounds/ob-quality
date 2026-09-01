"""Browse models in the catalog.

Run with:
    python flows/models/browse_models_flow.py --environment=fast-bakery run --with kubernetes
"""

from metaflow import FlowSpec, anaconda_models, step

from testdata.model_catalog_data import BROWSE_LIMIT
from utils.model_validators import validate_models


class BrowseModelsFlow(FlowSpec):
    @anaconda_models
    @step
    def start(self):
        models = self.anaconda_models.list_models(limit=BROWSE_LIMIT)

        assert isinstance(models, list), (
            f"Expected a list of models, got {type(models).__name__}"
        )
        assert models, "Expected at least one model"
        assert len(models) <= BROWSE_LIMIT, (
            f"Expected at most {BROWSE_LIMIT} models, got {len(models)}"
        )

        validate_models(models)

        names = [model["name"] for model in models]
        assert len(names) == len(set(names)), (
            f"Expected unique model names, got {names}"
        )

        print(f"Validated {len(models)} models")

        self.next(self.end)

    @step
    def end(self):
        print("BROWSE MODELS FLOW PASSED")


if __name__ == "__main__":
    BrowseModelsFlow()
