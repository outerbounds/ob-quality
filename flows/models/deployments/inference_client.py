import argparse

from openai import OpenAI


def get_auth_headers():
    from metaflow.metaflow_config import SERVICE_HEADERS

    if not isinstance(SERVICE_HEADERS, dict) or not SERVICE_HEADERS:
        raise RuntimeError("Outerbounds authentication headers are unavailable")
    return dict(SERVICE_HEADERS)


default_messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Who won the world series in 2020?"},
    {
        "role": "assistant",
        "content": "The Los Angeles Dodgers won the World Series in 2020.",
    },
    {"role": "user", "content": "Where was it played?"},
]


def parse_args():
    parser = argparse.ArgumentParser(description="Client for an OpenAI-compatible inference server")
    parser.add_argument("--stream", action="store_true", help="Enable streaming response")
    parser.add_argument("--url", required=True, help="URL of the inference server")
    parser.add_argument("--prompt", type=str, default=None, help="Prompt to send to the model")
    return parser.parse_args()


def main(args):
    base_url = args.url.rstrip("/")
    if not base_url.endswith("/v1"):
        base_url = f"{base_url}/v1"

    client = OpenAI(
        # The inference server does not require an API key, but the client does.
        api_key="EMPTY",
        base_url=base_url,
        default_headers=get_auth_headers(),
    )

    models = client.models.list()
    if not models.data:
        raise RuntimeError("Inference server returned no available models")
    model = models.data[0].id

    # Use provided prompt or default messages
    if args.prompt:
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": args.prompt},
        ]
    else:
        messages = default_messages

    # Chat Completion API
    chat_completion = client.chat.completions.create(
        messages=messages,
        model=model,
        stream=args.stream,
    )

    if args.stream:
        output = []
        for chunk in chat_completion:
            if not chunk.choices:
                continue
            content = chunk.choices[0].delta.content
            if content:
                output.append(content)
                print(content, end="", flush=True)
        print()
        response_text = "".join(output)
    else:
        if not chat_completion.choices:
            raise RuntimeError("Inference server returned no completion choices")
        response_text = chat_completion.choices[0].message.content or ""
        print(response_text)

    if not response_text.strip():
        raise RuntimeError("Expected a non-empty inference response")


if __name__ == "__main__":
    main(parse_args())
