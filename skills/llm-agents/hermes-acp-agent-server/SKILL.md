---
name: hermes-acp-agent-server
description: Expose an LLM agent via the Agent Client Protocol (VS Code / Zed / JetBrains) with per-session state and MCP injection.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [llm-agents, acp, ide-integration, mcp, session]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Expose an Agent via ACP (Agent Client Protocol)

## Context

ACP is the emerging stdio protocol for editor ↔ agent communication (VS Code "ACP Client", Zed built-in, JetBrains plugin). An ACP server can stream tool calls, request permissions, and offer model pickers inside the editor UI. Hermes implements it as a thin adapter over its synchronous `AIAgent`.

## When to use

- You want your agent to be a first-class citizen in VS Code / Zed / JetBrains.
- You already have a sync `Agent.run_conversation()` and need an async protocol front-end.
- You want editor-supplied MCP servers to extend tool surface per-session.

## Procedure

### 1. Registry manifest for discovery

Ship an `acp_registry/agent.json` so the editor's ACP client can launch you:

```json
{
  "schema_version": 1,
  "name": "hermes-agent",
  "display_name": "Hermes Agent",
  "description": "AI agent...",
  "icon": "icon.svg",
  "distribution": {
    "type": "command",
    "command": "hermes",
    "args": ["acp"]
  }
}
```

(`acp_registry/agent.json`)

### 2. `initialize()` — advertise capabilities + auth methods

Detect provider credentials and build `AuthMethodAgent` entries for what's configured. Advertise session fork / list / resume capabilities the client can rely on (`acp_adapter/server.py:311-351`).

### 3. One `SessionManager` owns state; the protocol surface is thin

Every ACP method (`new_session`, `load_session`, `resume_session`, `fork_session`, `cancel`, `list_sessions`) is a 3–10 line delegation into `SessionManager`, then `_schedule_available_commands_update()` to advertise slash commands.

`SessionState` holds the `AIAgent` instance, history, cwd, optional `cancel_event`, and config options (`acp_adapter/session.py`). Save on every mutation so a process crash loses nothing.

### 4. Bridge sync agent → async protocol via ThreadPoolExecutor

```python
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="acp-agent")

async def prompt(self, prompt, session_id, **kwargs):
    ...
    result = await loop.run_in_executor(_executor, _run_agent)
```

4 workers is deliberate: each agent call is heavy. Per-session concurrency > global parallelism.

### 5. Stream events via callbacks set on the agent

Before calling `agent.run_conversation()`, install five callbacks that translate agent events into ACP `session_update` messages:

```python
agent.tool_progress_callback = make_tool_progress_cb(conn, session_id, loop, ...)
agent.thinking_callback = make_thinking_cb(conn, session_id, loop)
agent.step_callback = make_step_cb(conn, session_id, loop, ...)
agent.message_callback = make_message_cb(conn, session_id, loop)
# approvals intercepted at the terminal-tool level
_terminal_tool.set_approval_callback(make_approval_callback(conn.request_permission, loop, session_id))
```

(`acp_adapter/server.py:501-526`)

The callbacks use `asyncio.run_coroutine_threadsafe()` to schedule back onto the event loop from the worker thread.

### 6. Inject editor-provided MCP servers per session

ACP clients can pass `mcp_servers` on `new_session` / `load_session`. Register them into the tool registry, then **refresh the agent's tool surface and invalidate the cached system prompt** so the new tools actually appear:

```python
async def _register_session_mcp_servers(self, state, mcp_servers):
    config_map = {s.name: {...} for s in mcp_servers}
    await asyncio.to_thread(register_mcp_servers, config_map)
    state.agent.tools = get_tool_definitions(
        enabled_toolsets=state.agent.enabled_toolsets or ["hermes-acp"],
        disabled_toolsets=state.agent.disabled_toolsets,
        quiet_mode=True,
    )
    state.agent.valid_tool_names = {t["function"]["name"] for t in state.agent.tools}
    if hasattr(state.agent, "_invalidate_system_prompt"):
        state.agent._invalidate_system_prompt()
```

(`acp_adapter/server.py:244-307`)

### 7. Handle slash commands locally when they don't need the LLM

Intercept leading `/` in `prompt()` for `/help`, `/model`, `/tools`, `/context`, `/reset`, `/compact`, `/version`. Return `None` from `_handle_slash_command` for unknown commands so they fall through to the LLM (user may have typed `/maybe` as prose). See `acp_adapter/server.py:636-779`.

### 8. Model picker via `SessionModelState`

Build `ModelInfo` entries from your curated provider list and keep `current_model_id` encoded as `<provider>:<model>` so the editor preserves provider context on switch:

```python
@staticmethod
def _encode_model_choice(provider, model) -> str:
    if not model: return ""
    if not provider: return model
    return f"{provider.lower()}:{model}"
```

`set_session_model()` is called when the user picks from the dropdown — rebuild the agent with the new provider/key (`acp_adapter/server.py:783-815`).

### 9. `cancel()` must actually cancel

Set the cancel event AND call `agent.interrupt()` so long-running tool calls abort, not just future API calls:

```python
async def cancel(self, session_id, **kwargs):
    state = self.session_manager.get_session(session_id)
    if state and state.cancel_event:
        state.cancel_event.set()
        if hasattr(state.agent, "interrupt"):
            state.agent.interrupt()
```

Report back `stop_reason="cancelled"` in the next `PromptResponse`.

## Pitfalls

- **Don't reset ContextVars across thread hop.** If your agent uses `contextvars` for session identity, copy the context before submitting to the executor.
- **Don't skip `_invalidate_system_prompt()` after MCP refresh** — agent keeps serving stale schemas and hallucinates missing tools.
- **Backward-compat import dance for renamed schema types**: `AuthMethodAgent` was `AuthMethod` before 0.9.0. Use a try/except at import (`acp_adapter/server.py:49-52`).
- **Auto-title responses.** Call `maybe_auto_title()` after a successful turn so the session picker has useful labels (`acp_adapter/server.py:560-571`).
