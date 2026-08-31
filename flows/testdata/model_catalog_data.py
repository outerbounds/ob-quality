"""Test data for the model catalog Metaflow flows."""

BROWSE_LIMIT = 5

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
