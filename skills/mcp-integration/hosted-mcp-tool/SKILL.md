---
name: hosted-mcp-tool
description: Let OpenAI's Responses API call a remote MCP server on your behalf using HostedMCPTool.
category: mcp-integration
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, mcp, hosted, responses-api, remote-tools]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: docs/mcp.md
imported_at: 2026-04-18T00:00:00Z
---

# hosted-mcp-tool

Use `HostedMCPTool` when you want OpenAI's infrastructure to handle MCP tool calls to a publicly reachable server, without round-trips to your Python process. Works only with OpenAI Responses API models.

## When to apply

When the MCP server is publicly accessible and you want to avoid the latency of local tool execution. The model lists and calls tools server-side.

## Core snippet

```python
import asyncio
from agents import Agent, HostedMCPTool, Runner

async def main():
    agent = Agent(
        name="MCP Assistant",
        instructions="Use the available tools to answer questions.",
        tools=[
            HostedMCPTool(
                tool_config={
                    "type": "mcp",
                    "server_label": "my_server",
                    "server_url": "https://my-mcp-server.example.com/mcp",
                    "require_approval": "never",
                }
            )
        ],
    )
    result = await Runner.run(agent, "What tools are available?")
    print(result.final_output)

asyncio.run(main())
```

## With approval required

```python
HostedMCPTool(
    tool_config={
        "type": "mcp",
        "server_label": "dangerous_server",
        "server_url": "https://example.com/mcp",
        "require_approval": "always",  # Pause for human approval
    }
)
```

## Key notes

- Server must be publicly reachable from OpenAI's infrastructure
- `require_approval: "never"` auto-approves; `"always"` triggers `result.interruptions`
- Does not support local/private MCP servers (use `MCPServerStdio` or `MCPServerSse` instead)
- Only works with `OpenAIResponsesModel`-backed agents
- Tool listing and invocation happen server-side; no Python callback for individual tool calls
