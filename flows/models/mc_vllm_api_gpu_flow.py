from metaflow import FlowSpec, current, kubernetes, resources, step, vllm


class VllmOpenAIInferenceFlow(FlowSpec):
    @vllm(
        source="anaconda",
        openai_api_server=True,
        max_retries=120,
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
        """Run vLLM inference through its OpenAI-compatible API."""
        import openai

        print("Running vllm OpenAI workflow.")
        print("Downloading model from Anaconda.")
        print("Inference is up and running!", flush=True)

        client = openai.OpenAI(
            base_url=current.vllm.local_endpoint,
            api_key="token-abc123",
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
        )

        self.responses = [choice.message.content for choice in response.choices]
        print(self.responses)
        self.next(self.end)

    @step
    def end(self):
        """Finish the vLLM OpenAI-compatible API workflow."""
        print("Finished vllm OpenAI workflow downloading from Anaconda.")


if __name__ == "__main__":
    VllmOpenAIInferenceFlow()
