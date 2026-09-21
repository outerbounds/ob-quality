from metaflow import FlowSpec, current, kubernetes, llamacpp, resources, step, timeout
from testdata.model_catalog_data import (
    INFERENCE_TASK_TIMEOUT_MINUTES,
    MAX_OUTPUT_TOKENS,
    METAFLOW_GPU_COMPUTE_CONFIG,
)


class LlamaCppGpuDirectInferenceFlow(FlowSpec):
    @llamacpp(
        source="anaconda",
        model="Qwen/Qwen2.5-0.5B-Instruct",
        quant="q8_0",
    )
    @kubernetes(
        **METAFLOW_GPU_COMPUTE_CONFIG,
        image="006988687827.dkr.ecr.us-west-2.amazonaws.com/anaconda-llamacpp:latest",
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
        """Run llama.cpp inference on a GPU."""
        print("GPU Inference is up and running!", flush=True)

        # Direct access to the llama.cpp engine.
        llm = current.llamacpp.llm

        self.messages = [
            {
                "role": "user",
                "content": "Which Python package would help me solve linear algebra equations?",
            },
        ]

        print(self.messages[-1]["content"])

        outputs = llm.create_chat_completion(self.messages, max_tokens=MAX_OUTPUT_TOKENS)

        self.response = outputs["choices"][0]["message"]["content"]
        assert isinstance(self.response, str) and self.response.strip(), (
            "Expected a non-empty llama.cpp inference response"
        )
        print(self.response)

        self.next(self.end)

    @step
    def end(self):
        """Finish the GPU inference workflow."""
        print("Finished llama.cpp GPU workflow downloading from Anaconda")


if __name__ == "__main__":
    LlamaCppGpuDirectInferenceFlow()
