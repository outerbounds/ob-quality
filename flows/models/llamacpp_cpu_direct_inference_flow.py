from metaflow import FlowSpec, conda, current, kubernetes, llamacpp, resources, step


class LlamaCppCpuDirectInferenceFlow(FlowSpec):
    @llamacpp(
        source="anaconda",
        model="Qwen/Qwen2.5-0.5B-Instruct",
        quant="q8_0",
    )
    @conda(
        python="3.11.13",
        packages={
            "llama-cpp-python": "",
            "llama.cpp": "=*=cpu_*",
        },
    )
    # CPU Metaflow task pool for the dev-coldbrewcrew test environment.
    @kubernetes(compute_pool="metaflow-cpu")
    @resources(
        cpu=2,
        memory=8192,
        disk=10240,
    )
    @step
    def start(self):
        """Run llama.cpp inference on the CPU."""
        print("CPU Inference is up and running!", flush=True)

        # Direct access to the llama.cpp engine.
        llm = current.llamacpp.llm

        self.messages = [
            {
                "role": "user",
                "content": "Give me a famous Benjamin Franklin quote.",
            },
        ]

        print(self.messages[-1]["content"])

        outputs = llm.create_chat_completion(self.messages)

        self.response = outputs["choices"][0]["message"]["content"]
        assert isinstance(self.response, str) and self.response.strip(), (
            "Expected a non-empty llama.cpp inference response"
        )
        print(self.response)

        self.next(self.end)

    # This local step only prints; use the launching Python environment.
    @conda(disabled=True)
    @step
    def end(self):
        """Finish the CPU inference workflow."""
        print("Finished llama.cpp CPU workflow downloading from Anaconda")


if __name__ == "__main__":
    LlamaCppCpuDirectInferenceFlow()
