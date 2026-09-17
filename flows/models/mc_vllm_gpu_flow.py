from metaflow import FlowSpec, current, kubernetes, resources, step, vllm


class VllmDirectInferenceFlow(FlowSpec):
    @vllm(
        source="anaconda",
        model="Qwen/Qwen3-0.6B",
    )
    @kubernetes(
        image="006988687827.dkr.ecr.us-west-2.amazonaws.com/anaconda-vllm:latest",
        compute_pool="metaflow-gpu",
    )
    @resources(
        cpu=2,
        memory=8192,
        disk=10240,
        gpu=1,
    )
    @step
    def start(self):
        """Run inference directly with the vLLM engine."""
        try:
            from vllm.sampling_params import SamplingParams
        except ImportError:
            pass

        print("Running vllm direct workflow.")
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

        outputs = llm.chat(self.messages, sampling_params=SamplingParams(max_tokens=2048))

        self.responses = [[o.text for o in output.outputs] for output in outputs]
        print(self.responses)
        self.next(self.end)

    @step
    def end(self):
        """Finish the direct vLLM inference workflow."""
        print("Finished vllm direct workflow downloading from Anaconda.")


if __name__ == "__main__":
    VllmDirectInferenceFlow()
