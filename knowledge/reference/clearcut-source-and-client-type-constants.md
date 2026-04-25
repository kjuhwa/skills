---
version: 0.1.0-draft
name: clearcut-source-and-client-type-constants
summary: Shipping events to Google Clearcut requires two well-known numeric constants in every LogRequest: `log_source` (assigned per project — chrome-devtools-mcp uses 2839) and `client_info.client_type` (47 for CLI-like tools), wrapped around a `source_extension_json` stringified event.
category: reference
confidence: medium
tags: [clearcut, google-telemetry, constants, batch-format]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/telemetry/watchdog/ClearcutSender.ts
imported_at: 2026-04-18T00:00:00Z
---

# Clearcut LogRequest Constants

## Context

Google's internal Clearcut logging endpoint (`https://play.googleapis.com/log?format=json_proto`) accepts batches of events in a specific envelope shape. Every event must include per-project constants so the pipeline routes and rate-limits correctly.

## The fact / decision / pitfall

Fixed constants used by chrome-devtools-mcp:

- `LOG_SOURCE = 2839` — Clearcut project ID for chrome-devtools-mcp. Google-internal allocation; different project = different ID.
- `CLIENT_TYPE = 47` — indicates "CLI/tool-ish client" (vs. mobile app, web, etc.). Stable across projects.
- `DEFAULT_CLEARCUT_ENDPOINT = 'https://play.googleapis.com/log?format=json_proto'`
- `MIN_RATE_LIMIT_WAIT_MS = 30_000` — honor `next_request_wait_millis` from response, but clamp to at least 30s to avoid tight-looping on bugs.
- `DEFAULT_FLUSH_INTERVAL_MS = 15 * 60 * 1000` — 15-minute idle flush cadence.
- `SHUTDOWN_TIMEOUT_MS = 5_000` — bound on the final flush race.
- `SESSION_ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000` — rotate `session_id` daily.
- `MAX_BUFFER_SIZE = 1000` — drop-oldest overflow.

Envelope shape:

```json
{
  "log_source": 2839,
  "request_time_ms": "1713407232000",
  "client_info": { "client_type": 47 },
  "log_event": [
    { "event_time_ms": "1713407230000", "source_extension_json": "{...stringified event...}" }
  ]
}
```

Response:

```json
{ "next_request_wait_millis": 60000 }
```

## Evidence

- `src/telemetry/watchdog/ClearcutSender.ts` — all constants and envelope formatting.
- `src/telemetry/types.ts` — `LogRequest`, `LogResponse`, and per-event `ChromeDevToolsMcpExtension` shapes.

## Implications

- If you're shipping a different Google-Cloud tool, you need your own `log_source`. It's not negotiable; Clearcut rejects unknown IDs.
- Honoring `next_request_wait_millis` is what keeps the endpoint happy. Clients that ignore it get dropped silently.
- `source_extension_json` is the escape hatch — arbitrary JSON as a string. It's how you ship structured event payloads without a server-side schema change.
- For non-Google pipelines, the *shape* of "envelope + batch + next_wait hint" is reusable even if the constants aren't. It's a good blueprint for any batch telemetry.
