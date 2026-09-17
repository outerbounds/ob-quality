import argparse
import json
import os

from openai import OpenAI


def get_auth_headers():
    from metaflow.metaflow_config_funcs import init_config

    conf = init_config()
    if conf:
        headers = {"x-api-key": conf["METAFLOW_SERVICE_AUTH_KEY"]}
    else:
        headers = json.loads(os.environ["METAFLOW_SERVICE_HEADERS"])
    return headers


# Modify OpenAI's API key and API base to use vLLM's API server.
openai_api_key = "EMPTY"

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
    parser = argparse.ArgumentParser(description="Client for vLLM API server")
    parser.add_argument("--stream", action="store_true", help="Enable streaming response")
    parser.add_argument("--url", type=str, default=None, help="URL of the vLLM API server")
    parser.add_argument("--prompt", type=str, default=None, help="Prompt to send to the model")
    return parser.parse_args()


def main(args):
    if not args.url:
        raise ValueError("URL is required")
    client = OpenAI(
        # defaults to os.environ.get("OPENAI_API_KEY")
        api_key=openai_api_key,
        base_url=f"{args.url.rstrip('/')}/v1",
        default_headers=get_auth_headers(),
    )

    models = client.models.list()
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
            content = chunk.choices[0].delta.content
            if content:
                output.append(content)
                print(content, end="", flush=True)
        print()
        response_text = "".join(output)
    else:
        response_text = chat_completion.choices[0].message.content or ""
        print(response_text)

    if not response_text.strip():
        raise RuntimeError("Expected a non-empty inference response")


if __name__ == "__main__":
    args = parse_args()
    main(args)
