import os

from metaflow import FlowSpec, current, kubernetes, resources, step, timeout, vllm
from testdata.model_catalog_data import (
    INFERENCE_TASK_TIMEOUT_MINUTES,
    MAX_OUTPUT_TOKENS,
    OPENAI_REQUEST_TIMEOUT_SECONDS,
)


class VllmGpuOpenAIAPIInferenceFlow(FlowSpec):
    @vllm(
        source="anaconda",
        openai_api_server=True,
        max_retries=120,
        model="Qwen/Qwen3-0.6B",
    )
    @kubernetes(
        compute_pool=os.getenv("METAFLOW_GPU_COMPUTE_POOL"),
        image="006988687827.dkr.ecr.us-west-2.amazonaws.com/anaconda-vllm:latest",
    )
    @resources(
        cpu=2,
        memory=8192,
        disk=10240,
        gpu=1,
    )
    @timeout(minutes=INFERENCE_TASK_TIMEOUT_MINUTES)
    @step
    def start(self):
        """Run vLLM inference through its OpenAI-compatible API."""
        import openai

        print("Running vLLM OpenAI-compatible API workflow.")
        print("Downloading model from Anaconda.")
        print("Inference is up and running!", flush=True)

        client = openai.OpenAI(
            base_url=current.vllm.local_endpoint,
            api_key="EMPTY",
            timeout=OPENAI_REQUEST_TIMEOUT_SECONDS,
        )

        self.messages = [
            {
                "role": "user",
                "content": (
                    "What is the difference between pythons and anacondas? "
                    "Think snakes, not software."
                ),
            },
        ]

        print(self.messages[-1]["content"])

        response = client.chat.completions.create(
            model=current.vllm.model_name,
            messages=self.messages,
            max_tokens=MAX_OUTPUT_TOKENS,
        )

        self.responses = [choice.message.content for choice in response.choices]
        assert any(isinstance(response, str) and response.strip() for response in self.responses), (
            "Expected at least one non-empty vLLM inference response"
        )
        print(self.responses)
        self.next(self.end)

    @step
    def end(self):
        """Finish the vLLM OpenAI-compatible API workflow."""
        print("Finished vLLM OpenAI-compatible API workflow downloading from Anaconda.")


if __name__ == "__main__":
    VllmGpuOpenAIAPIInferenceFlow()
