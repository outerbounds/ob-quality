"""Test data for the model catalog Metaflow flows."""

BROWSE_LIMIT = 5

# Metaflow task pools for Model Catalog smoke tests in dev-coldbrewcrew.
METAFLOW_CPU_COMPUTE_CONFIG = {"compute_pool": "metaflow-cpu"}
METAFLOW_GPU_COMPUTE_CONFIG = {"compute_pool": "metaflow-gpu"}

# Bounds for inference smoke tests.
MAX_OUTPUT_TOKENS = 2048
OPENAI_REQUEST_TIMEOUT_SECONDS = 120
INFERENCE_TASK_TIMEOUT_MINUTES = 15

# Selected because these models are available in the Anaconda Model Catalog,
# relatively small, and suitable for E2E download testing.
GGUF_MODEL = {
    "name": "Qwen2.5-0.5B",
    "format": "gguf",
    "quant_method": "q4_k_m",
    "minimum_size_mb": 50,
}

SAFETENSORS_MODEL = {
    "name": "gpt2",
    "format": "safetensors",
    "minimum_file_count": 1,
}
