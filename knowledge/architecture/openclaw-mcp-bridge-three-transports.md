---
version: 0.1.0-draft
name: openclaw-mcp-bridge-three-transports
summary: OpenSRE integrates with OpenClaw (an AI coding assistant) as an MCP server, supporting three transports in one config — stdio (local dev), SSE (hosted), and streamable-http (default) — with a detached-lifetime httpx shim so one pool serves many servers.
category: plugin-architecture
tags: [mcp, openclaw, transports, integration]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/integrations/openclaw.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# OpenClaw MCP Bridge — Three Transports

## Design
`OpenClawConfig` is one Pydantic model for all three MCP transports. A `mode` field (Literal) selects:

- **`stdio`** — subprocess; `command + args` required. Default args: `("mcp", "serve")`. For local dev where OpenClaw and OpenSRE share a machine.
- **`sse`** — Server-Sent Events over HTTP; `url` required.
- **`streamable-http`** (default) — Bidirectional HTTP streaming per MCP spec; `url` required.

## Transport-specific requirements enforced in Pydantic
```python
@model_validator(mode="after")
def _validate_transport_requirements(self):
    if self.mode == "stdio" and not self.command:
        raise ValueError("stdio mode requires 'command'")
    if self.mode in ("sse", "streamable-http") and not self.url:
        raise ValueError(f"{self.mode} mode requires 'url'")
    return self
```

## Shared httpx client
Because opening a new `httpx.AsyncClient` per MCP server would thrash connection pools, OpenSRE:
1. Creates one `AsyncClient` at app startup.
2. Wraps it in `_DetachExitAsyncClientCM` — a tiny async CM that yields the client but never closes it.
3. Passes a factory to `streamablehttp_client`'s `httpx_client_factory` param.

The factory signature accepts `headers`/`timeout`/`auth` from the SDK (and ignores them — they're already set on the shared client).

## Why streamable-http is the default
- Bidirectional messaging over HTTP semantics (works through corporate proxies).
- No long-lived daemon like SSE (plays well with serverless and load balancers).
- Official MCP spec mode as of late 2024.

## When stdio wins
Local development: you launch OpenClaw as a subprocess, it lives and dies with the OpenSRE process. No network config, no token, no URL.

## Guard against misconfiguration
A helper `_looks_like_openclaw_control_ui_url` detects the Control UI URL (`http://127.0.0.1:18789/`) in case a user pasted it expecting it's the MCP URL. The two have different endpoints even though they share the host/port.
