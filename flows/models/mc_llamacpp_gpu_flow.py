from metaflow import FlowSpec, current, kubernetes, llamacpp, resources, step


class LlamacppGpuInferenceFlow(FlowSpec):
    @llamacpp(
        source="anaconda",
        model="Qwen/Qwen2.5-0.5B-Instruct",
        quant="q8_0",
    )
    @kubernetes(
        image="006988687827.dkr.ecr.us-west-2.amazonaws.com/anaconda-llamacpp:latest",
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
        """Run llama.cpp inference on a GPU."""
        print("GPU Inference is up and running!", flush=True)

        # Direct access to LlamaCpp engine
        llm = current.llamacpp.llm

        self.messages = [
            {
                "role": "user",
                "content": "Which Python package would help me solve linear algebra equations?",
            },
        ]

        print(self.messages[-1]["content"])

        outputs = llm.create_chat_completion(self.messages)

        self.response = outputs["choices"][0]["message"]["content"]
        assert isinstance(self.response, str) and self.response.strip(), (
            "Expected a nonempty llama.cpp inference response"
        )
        print(self.response)

        self.next(self.end)

    @step
    def end(self):
        """Finish the GPU inference workflow."""
        print("Finished llama.cpp GPU workflow downloading from Anaconda")


if __name__ == "__main__":
    LlamacppGpuInferenceFlow()
