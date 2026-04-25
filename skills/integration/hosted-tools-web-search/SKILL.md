---
name: hosted-tools-web-search
description: Add hosted OpenAI tools (WebSearchTool, FileSearchTool, CodeInterpreterTool) to an agent.
category: integration
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, web-search, file-search, code-interpreter, hosted-tools]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/tools/web_search.py
imported_at: 2026-04-18T00:00:00Z
---

# hosted-tools-web-search

Use `WebSearchTool`, `FileSearchTool`, or `CodeInterpreterTool` from `agents` package. These run on OpenAI's servers without your Python code handling the execution.

## When to apply

When you need real-time web search, vector store retrieval, or sandboxed code execution without building and maintaining tool infrastructure.

## Web search

```python
from agents import Agent, Runner, WebSearchTool

agent = Agent(
    name="Web searcher",
    instructions="You are a helpful agent.",
    tools=[WebSearchTool(
        user_location={"type": "approximate", "city": "New York"},
        search_context_size="medium",  # "low" | "medium" | "high"
    )],
)
result = await Runner.run(agent, "What's the latest local sports news?")
```

## File search (vector store)

```python
from agents import Agent, FileSearchTool

agent = Agent(
    name="Research assistant",
    tools=[FileSearchTool(
        max_num_results=3,
        vector_store_ids=["vs_abc123"],
    )],
)
```

## Code interpreter

```python
from agents import Agent, CodeInterpreterTool

agent = Agent(
    name="Data analyst",
    model="gpt-4o",
    instructions="Use the code interpreter to solve numeric problems.",
    tools=[CodeInterpreterTool(
        tool_config={"type": "code_interpreter", "container": {"type": "auto"}},
    )],
)
```

## Key notes

- Hosted tools run server-side; your Python process is NOT called for each tool invocation
- `on_tool_start/end` lifecycle hooks do NOT fire for hosted tools
- `WebSearchTool` supports `filters` for domain inclusion/exclusion
- `FileSearchTool` supports `ranking_options` and `include_search_results`
- `CodeInterpreterTool` requires org verification for gpt-5 class models with streaming
