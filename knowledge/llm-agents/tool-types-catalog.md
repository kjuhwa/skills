---
version: 0.1.0-draft
name: tool-types-catalog
summary: Catalog of all tool types in the OpenAI Agents SDK — when to use each, what executes where, and key limitations.
category: llm-agents
confidence: high
tags: [openai-agents, tools, function-tool, hosted-tools, mcp, computer-use]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: docs/tools.md, src/agents/tool.py
imported_at: 2026-04-18T00:00:00Z
---

# Tool Types Catalog

## 1. Function Tools (`@function_tool`)
- **Executes in**: your Python process
- **Schema from**: type hints, docstring, Annotated descriptions
- **When to use**: wrap any Python function — API calls, computation, database queries
- **Supports**: `needs_approval`, `defer_loading`, tool guardrails, tool namespaces
- **Hook visibility**: `on_tool_start` / `on_tool_end` lifecycle hooks fire for these

## 2. Hosted OpenAI Tools
Execute server-side on OpenAI's infrastructure. No Python callback per call.

| Class | Purpose |
|---|---|
| `WebSearchTool` | Real-time web search |
| `FileSearchTool` | Search OpenAI vector stores |
| `CodeInterpreterTool` | Run code in sandboxed environment |
| `ImageGenerationTool` | Generate images from prompts |
| `HostedMCPTool` | Delegate to remote MCP server via Responses API |
| `ToolSearchTool` | Load deferred tool namespaces on demand |

**Note**: Lifecycle hooks (`on_tool_start/end`) do NOT fire for hosted tools.

## 3. MCP Servers
- **Executes in**: separate process (stdio) or remote server (HTTP)
- Add via `Agent.mcp_servers=[MCPServerStdio(...), ...]`
- Tools appear in the agent's tool list automatically after `list_tools()`
- Supports caching, tool filtering, custom error handling

## 4. Agents as Tools
- **Executes in**: nested agent loop in your Python process
- Created via `agent.as_tool(tool_name, tool_description)`
- Specialist agent runs; its output is returned as a string to the orchestrator
- **Does not** use the normal function-tool pipeline; tool guardrails do not apply

## 5. Local Runtime Tools
- `ShellTool` / `LocalShellTool` — execute shell commands
- `ComputerTool` — control a computer (screenshots, clicks, keyboard)
- `ApplyPatchTool` — apply unified diffs to files
- Run in your environment; require explicit `Computer` or sandbox client setup

## 6. Codex Tool (Experimental)
- `CodexTool` — run workspace-scoped Codex coding tasks
- Available from `agents` package; requires sandbox setup

## Decision Matrix

| Need | Tool type |
|---|---|
| Call Python function | `@function_tool` |
| Search the web | `WebSearchTool` |
| Query vector store | `FileSearchTool` |
| Execute code | `CodeInterpreterTool` |
| Use private MCP server | `MCPServerStdio` / `MCPServerSse` |
| Use public MCP server via OpenAI | `HostedMCPTool` |
| Call specialist agent, orchestrator keeps control | `agent.as_tool()` |
| Defer tool loading for large tool sets | `defer_loading=True` + `ToolSearchTool` |

## Source paths
- `src/agents/tool.py` — all tool class definitions
- `docs/tools.md` — full tool catalog and usage guide
