---
version: 0.1.0-draft
name: openai-agents-sdk-architecture
summary: High-level architecture of the OpenAI Agents Python SDK — agents, runners, tools, handoffs, guardrails, sessions, and tracing.
category: llm-agents
confidence: high
tags: [openai-agents, architecture, sdk, multi-agent, overview]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: README.md, docs/agents.md, docs/running_agents.md
imported_at: 2026-04-18T00:00:00Z
---

# OpenAI Agents SDK Architecture

The OpenAI Agents Python SDK is a lightweight, provider-agnostic framework for building multi-agent workflows. It abstracts the agentic loop (model call → tool execution → model call) while providing first-class support for multi-agent patterns.

## Core Components

### Agent
- Defined by: `name`, `instructions` (static str or callable), `tools`, `handoffs`, `guardrails`, `output_type`, `model`, `model_settings`
- Does NOT run itself; it is a configuration object
- `SandboxAgent` extends `Agent` with workspace/manifest support (v0.14.0+)

### Runner
- `Runner.run(agent, input, context=...)` — async, returns `RunResult`
- `Runner.run_sync(...)` — synchronous wrapper
- `Runner.run_streamed(...)` — async streaming, returns `RunResultStreaming`
- Executes the agent loop: call model → process response (tool calls / handoffs / final output) → repeat

### Agent Loop
1. Call LLM with current input + instructions + tools
2. If LLM returns final text output → done
3. If LLM calls a tool → execute tool, append result, loop
4. If LLM triggers a handoff → switch to the handoff target agent, loop
5. If `max_turns` exceeded → raise `MaxTurnsExceeded`

### Tools
- **Function tools**: Python functions decorated with `@function_tool`; auto-generates JSON schema from signature
- **Hosted tools**: `WebSearchTool`, `FileSearchTool`, `CodeInterpreterTool`, `ImageGenerationTool`, `HostedMCPTool` — execute server-side
- **MCP servers**: `MCPServerStdio`, `MCPServerSse`, `MCPServerStreamableHttp` — tool servers via MCP protocol
- **Agents as tools**: `agent.as_tool(...)` — specialist agent called as a tool, orchestrator retains control
- **Shell/Computer/Patch**: `ShellTool`, `ComputerTool`, `ApplyPatchTool` — workspace-native execution

### Handoffs
- Represented as tools to the LLM (`transfer_to_<agent_name>`)
- When triggered, the target agent becomes the active agent for the rest of the run
- `handoff()` function allows customization: `on_handoff`, `input_type`, `input_filter`, `is_enabled`

### Guardrails
- **Input guardrails**: run before/parallel with the first agent; `@input_guardrail`
- **Output guardrails**: run after the last agent produces output; `@output_guardrail`
- **Tool guardrails**: run per function-tool call; `@tool_input_guardrail` / `@tool_output_guardrail`
- Raise typed exceptions (`InputGuardrailTripwireTriggered`, `OutputGuardrailTripwireTriggered`)

### Context
- `RunContextWrapper[T]` wraps your app-defined context object
- Passed to all tools, hooks, and lifecycle callbacks
- NOT sent to the LLM — purely local runtime state
- Also exposes `.usage` (cumulative tokens), `.approve_tool()`, `.tool_input`

### Sessions
- Automatic conversation history management across `Runner.run()` calls
- Backends: `OpenAIConversationsSession`, `SQLiteSession`, `RedisSession`, `FileSession`, custom
- Replaces manual `result.to_input_list()` chaining

### Tracing
- Built-in: every run, agent turn, tool call, handoff, and guardrail is automatically spanned
- Export destination: OpenAI Traces dashboard (default)
- Custom processors via `TracingProcessor` interface
- Group multiple runs with `trace(workflow_name, group_id=...)`

## Source paths
- `src/agents/agent.py` — Agent definition
- `src/agents/run.py` — Runner
- `src/agents/tool.py` — Tool types and function_tool decorator
- `src/agents/handoffs/` — Handoff logic
- `src/agents/guardrail.py` — Guardrail types
- `src/agents/run_context.py` — RunContextWrapper
- `src/agents/memory/` — Session backends
- `src/agents/tracing/` — Tracing system
