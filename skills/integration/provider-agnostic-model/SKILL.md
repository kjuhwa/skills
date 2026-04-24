---
name: provider-agnostic-model
description: Use a non-OpenAI LLM provider (LiteLLM, Ollama, Anthropic) with the OpenAI Agents SDK via OpenAIChatCompletionsModel.
category: integration
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, litellm, ollama, provider-agnostic, chat-completions]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/model_providers/, docs/models/
imported_at: 2026-04-18T00:00:00Z
---

# provider-agnostic-model

Use `OpenAIChatCompletionsModel` with a custom `AsyncOpenAI` client pointing to any OpenAI-compatible endpoint (LiteLLM, Ollama, Groq, etc.). The agent API remains identical.

## When to apply

Using open-source or third-party models (Llama, Mistral, Claude via LiteLLM) while keeping the same agent orchestration, tracing, and tool-use infrastructure.

## With LiteLLM

```python
import asyncio
from openai import AsyncOpenAI
from agents import Agent, Runner, set_default_openai_client
from agents.models.openai_chatcompletions import OpenAIChatCompletionsModel

# LiteLLM proxy server
custom_client = AsyncOpenAI(
    base_url="http://localhost:4000",  # LiteLLM proxy
    api_key="sk-1234",
)

# Set globally
set_default_openai_client(custom_client, use_for_tracing=False)

agent = Agent(
    name="Assistant",
    instructions="You are a helpful assistant.",
    model=OpenAIChatCompletionsModel(model="gpt-4o", openai_client=custom_client),
)

async def main():
    result = await Runner.run(agent, "Hello!")
    print(result.final_output)

asyncio.run(main())
```

## With Ollama

```python
from openai import AsyncOpenAI
from agents.models.openai_chatcompletions import OpenAIChatCompletionsModel

ollama_client = AsyncOpenAI(base_url="http://localhost:11434/v1", api_key="ollama")

agent = Agent(
    name="Local assistant",
    model=OpenAIChatCompletionsModel(model="llama3.2", openai_client=ollama_client),
    instructions="Be helpful and concise.",
)
```

## Key notes

- `use_for_tracing=False` when pointing to non-OpenAI providers (tracing uses a separate OpenAI client)
- Set `OPENAI_API_KEY` env var to a dummy value if the provider doesn't require it
- Tool calling support depends on the provider's OpenAI-compatible implementation
- `OpenAIChatCompletionsModel` uses Chat Completions API; `OpenAIResponsesModel` uses Responses API
- Streaming works the same way; just use `Runner.run_streamed()`
