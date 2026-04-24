---
name: mcp-sse-streamable-http
description: Connect an agent to a remote MCP server via HTTP+SSE or Streamable HTTP transport.
category: mcp-integration
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, mcp, sse, streamable-http, remote-server]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/mcp/sse_example/main.py
imported_at: 2026-04-18T00:00:00Z
---

# mcp-sse-streamable-http

Use `MCPServerSse` for HTTP+SSE MCP servers or `MCPServerStreamableHttp` for Streamable HTTP servers. Both run tool calls in your Python process, unlike `HostedMCPTool`.

## When to apply

When you run a private MCP server (not exposed to the internet) that your Python process can reach, and you want tool execution to happen locally rather than on OpenAI's infrastructure.

## HTTP+SSE

```python
from agents import Agent, Runner
from agents.mcp import MCPServerSse

async def main():
    async with MCPServerSse(
        name="SSE Server",
        params={"url": "http://localhost:8000/sse"},
        cache_tools_list=True,
    ) as mcp_server:
        agent = Agent(
            name="Assistant",
            instructions="Use the tools to answer questions.",
            mcp_servers=[mcp_server],
        )
        result = await Runner.run(agent, "What tools do you have?")
        print(result.final_output)
```

## Streamable HTTP

```python
from agents.mcp import MCPServerStreamableHttp

async with MCPServerStreamableHttp(
    name="Streamable HTTP Server",
    params={"url": "http://localhost:8000/mcp"},
) as mcp_server:
    agent = Agent(name="Assistant", mcp_servers=[mcp_server])
    result = await Runner.run(agent, "Hello!")
```

## Key notes

- Both require the server to be running before the agent starts
- `cache_tools_list=True` caches the tool list to avoid repeated `list_tools()` calls
- Both support `tool_filter` for exposing only a subset of available tools
- `MCPServerStreamableHttp` is preferred for new servers; `MCPServerSse` for legacy servers
- Add `mcp_config={"convert_schemas_to_strict": True}` on the agent for better schema compatibility
