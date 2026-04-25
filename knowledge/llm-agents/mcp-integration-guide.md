---
version: 0.1.0-draft
name: mcp-integration-guide
summary: How to integrate MCP servers with OpenAI Agents SDK — transport options, tool filtering, caching, and hosted vs. local execution.
category: llm-agents
confidence: high
tags: [openai-agents, mcp, model-context-protocol, transport, hosted, stdio, sse]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: docs/mcp.md, src/agents/mcp/
imported_at: 2026-04-18T00:00:00Z
---

# MCP Integration Guide

## Transport Selection Matrix

| Scenario | Transport | Class |
|---|---|---|
| Public MCP server; let OpenAI call it | Hosted | `HostedMCPTool` |
| Remote server, tool calls in your process | Streamable HTTP | `MCPServerStreamableHttp` |
| Legacy HTTP+SSE server | SSE | `MCPServerSse` |
| Local subprocess (stdin/stdout) | stdio | `MCPServerStdio` |

## Hosted MCP (HostedMCPTool)

- OpenAI's Responses API makes tool calls directly to the MCP server
- Your Python process is NOT involved in individual tool calls
- Server must be publicly reachable
- Works only with OpenAI Responses API models
- Supports `require_approval: "never" | "always"` for tool call gating

## Local MCP Servers (Stdio, SSE, Streamable HTTP)

All three are used as async context managers:
```python
async with MCPServerStdio(name="...", params={...}) as server:
    agent = Agent(mcp_servers=[server], ...)
```

They share common patterns:
- `cache_tools_list=True` — cache `list_tools()` result per session
- `tool_filter=["tool_a", "tool_b"]` — expose only specific tools
- `failure_error_function` — custom error handling for MCP failures
- Tracing: MCP list_tools operations appear as `mcp_tools_span`

## Agent-Level MCP Config

```python
agent = Agent(
    name="Assistant",
    mcp_servers=[server],
    mcp_config={
        "convert_schemas_to_strict": True,  # Best-effort strict JSON schema
        "failure_error_function": None,      # None = raise exception on failure
    },
)
```

## MCP Server Prompts

Some MCP servers expose reusable prompts. Access them via:
```python
prompts = await server.list_prompts()
prompt = await server.get_prompt("prompt_name", arguments={...})
```

## Caching Behavior

`cache_tools_list=True`: The SDK calls `list_tools()` once and caches the result for the lifetime of the `async with` block. Use when the server's tool list is static.

Without caching: `list_tools()` is called at the start of each agent turn (new Runner.run() call).

## Custom Headers and Auth

```python
async with MCPServerStreamableHttp(
    name="Authenticated Server",
    params={
        "url": "https://api.example.com/mcp",
        "headers": {"Authorization": "Bearer token"},
    },
) as server:
    ...
```

## Source paths
- `src/agents/mcp/` — MCP implementation
- `src/agents/mcp/server.py` — MCPServerStdio, MCPServerSse, MCPServerStreamableHttp
- `docs/mcp.md` — comprehensive MCP guide
- `examples/mcp/` — runnable examples for each transport
