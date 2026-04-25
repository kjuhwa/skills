---
version: 0.1.0-draft
name: hermes-acp-session-capabilities
summary: ACP (Agent Client Protocol) capability set an agent must support for editor integration — fork, list, resume, models.
category: reference
tags: [acp, ide-integration, vs-code, zed, protocol]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# ACP Session Capabilities — What Editors Expect

An ACP agent advertises its capabilities in `InitializeResponse`. Hermes' set is a minimal-but-complete example for code-assistant integrations.

## Capability shape

```python
InitializeResponse(
    protocol_version=acp.PROTOCOL_VERSION,
    agent_info=Implementation(name="hermes-agent", version=HERMES_VERSION),
    agent_capabilities=AgentCapabilities(
        load_session=True,
        session_capabilities=SessionCapabilities(
            fork=SessionForkCapabilities(),
            list=SessionListCapabilities(),
            resume=SessionResumeCapabilities(),
        ),
    ),
    auth_methods=auth_methods,
)
```

(`acp_adapter/server.py:311-351`)

## What each capability implies

| Capability | ACP method you must implement | What the editor does with it |
|-----------|-------------------------------|-------------------------------|
| `load_session=True` | `load_session(session_id, cwd, mcp_servers?)` | Editor reopens previous sessions on restart |
| `session_capabilities.fork` | `fork_session(session_id, cwd, mcp_servers?)` | Editor offers "branch from this turn" |
| `session_capabilities.list` | `list_sessions(cwd?, cursor?)` | Session picker UI |
| `session_capabilities.resume` | `resume_session(session_id, cwd, mcp_servers?)` | Re-attach after process restart |
| (always) | `new_session(cwd, mcp_servers?)` | Creating a new chat |
| (always) | `prompt(prompt, session_id)` | Sending a user message |
| (always) | `cancel(session_id)` | User hits Escape |

## Auth methods

Built from whatever provider credentials are configured:

```python
auth_methods = [
    AuthMethodAgent(
        id=provider,
        name=f"{provider} runtime credentials",
        description=f"Authenticate Hermes using the currently configured {provider} runtime credentials.",
    )
]
```

If no provider is configured, `auth_methods=None` — the editor will prompt the user through its own login flow.

## Breaking change handling

ACP 0.9.0 renamed `AuthMethod` → `AuthMethodAgent`. Handle with a try/except on import so both versions work:

```python
try:
    from acp.schema import AuthMethodAgent
except ImportError:
    from acp.schema import AuthMethod as AuthMethodAgent
```

## Model picker

For editors that show a model dropdown (like Zed), return a `SessionModelState` with each entry encoded as `<provider>:<model>` so provider context isn't lost on switch:

```python
SessionModelState(
    available_models=[
        ModelInfo(
            model_id="anthropic:claude-opus-4.6",
            name="claude-opus-4.6",
            description="Provider: Anthropic • current"
        ),
        ...
    ],
    current_model_id="anthropic:claude-opus-4.6",
)
```

## Config + mode set endpoints

Even if your agent doesn't use them, **accept them** so switches from the editor UI don't fail:

```python
async def set_session_mode(self, mode_id, session_id, **kwargs):
    setattr(state, "mode", mode_id)
    return SetSessionModeResponse()

async def set_config_option(self, config_id, session_id, value, **kwargs):
    state.config_options[str(config_id)] = value
    return SetSessionConfigOptionResponse(config_options=[])
```

## Session updates stream

The client receives events via `conn.session_update(session_id, update)`. Common updates:

- `update_agent_message_text(...)` — stream response text
- `AvailableCommandsUpdate` — advertise slash commands
- Tool call start/progress/complete (via custom `session_update` types)
- Approval request (via `conn.request_permission(...)`)

## Reference

- `acp_adapter/server.py:95-600` — full agent implementation
- `acp_adapter/session.py` — `SessionManager` and `SessionState`
- `acp_registry/agent.json` — discovery manifest
- ACP protocol: https://github.com/anthropics/agent-client-protocol
