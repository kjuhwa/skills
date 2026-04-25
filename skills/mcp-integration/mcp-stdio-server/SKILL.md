---
name: mcp-stdio-server
description: Connect an agent to a local MCP server running as a subprocess over stdio.
category: mcp-integration
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, mcp, stdio, subprocess, local-tools]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/mcp
imported_at: 2026-04-18T00:00:00Z
---

# mcp-stdio-server

Use `MCPServerStdio` to launch a local process and communicate over stdin/stdout using the MCP protocol. Add the server to `Agent.mcp_servers`.

## When to apply

When you have an MCP server that runs as a local process (e.g., `npx @modelcontextprotocol/server-filesystem`). Best for development and trusted local environments.

## Core snippet

```python
import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStdio

async def main():
    async with MCPServerStdio(
        name="Filesystem Server",
        params={
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
        },
        # Optional: cache list_tools() result
        cache_tools_list=True,
    ) as mcp_server:
        agent = Agent(
            name="File assistant",
            instructions="Use the tools to answer questions about files.",
            mcp_servers=[mcp_server],
        )
        result = await Runner.run(agent, "List the files in /tmp")
        print(result.final_output)

asyncio.run(main())
```

## With tool filtering

```python
async with MCPServerStdio(
    name="Git Server",
    params={"command": "uvx", "args": ["mcp-server-git", "--repository", "."]},
    # Only expose specific tools from the server
    tool_filter=["git_log", "git_diff"],
) as mcp_server:
    agent = Agent(name="Git assistant", mcp_servers=[mcp_server])
```

## Key notes

- Use as an async context manager to manage the subprocess lifecycle
- `cache_tools_list=True` avoids repeated `list_tools()` calls per agent turn
- `tool_filter` accepts a list of tool names or a callable predicate
- MCP tool failures surface as tool error text by default; customize via `mcp_config`
- For remote servers, use `MCPServerSse` (HTTP+SSE) or `MCPServerStreamableHttp`
