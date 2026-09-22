import os

from metaflow import FlowSpec, current, kubernetes, resources, step, timeout, vllm
from testdata.model_catalog_data import (
    INFERENCE_TASK_TIMEOUT_MINUTES,
    MAX_OUTPUT_TOKENS,
)


class VllmGpuDirectInferenceFlow(FlowSpec):
    @vllm(
        source="anaconda",
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
        """Run inference directly with the vLLM engine."""
        from vllm.sampling_params import SamplingParams  # pylint: disable=import-error

        print("Running vLLM direct workflow.")
        print("Downloading model from Anaconda.")
        print("Inference is up and running!", flush=True)

        # Direct access to vLLM engine
        llm = current.vllm.llm

        self.messages = [
            {
                "role": "user",
                "content": "How do gyroscopes work?",
            },
        ]

        print(self.messages[-1]["content"])

        outputs = llm.chat(
            self.messages,
            sampling_params=SamplingParams(max_tokens=MAX_OUTPUT_TOKENS),
        )

        self.responses = [[o.text for o in output.outputs] for output in outputs]
        assert any(
            isinstance(response, str) and response.strip()
            for responses in self.responses
            for response in responses
        ), "Expected at least one non-empty vLLM inference response"
        print(self.responses)
        self.next(self.end)

    @step
    def end(self):
        """Finish the direct vLLM inference workflow."""
        print("Finished vLLM direct workflow downloading from Anaconda.")


if __name__ == "__main__":
    VllmGpuDirectInferenceFlow()
