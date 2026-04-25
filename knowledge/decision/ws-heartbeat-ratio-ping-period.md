---
version: 0.1.0-draft
name: ws-heartbeat-ratio-ping-period
summary: WebSocket server ping period should be 90% of pong-wait so a missing pong is detected before the next ping is due (e.g. 54s ping / 60s pongWait).
category: decision
tags: [websocket, heartbeat, ping-pong, liveness]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: server/internal/realtime/hub.go
imported_at: 2026-04-18T00:00:00Z
---

For server-side heartbeat on WebSocket connections, pick two constants with a specific ratio:

```go
const (
    writeWait  = 10 * time.Second                 // time to write one message
    pongWait   = 60 * time.Second                 // read deadline; connection dead if exceeded
    pingPeriod = (pongWait * 9) / 10              // ping before pongWait elapses
)
```

Ping period must be **less than** pongWait. The 9/10 ratio (54s for 60s pongWait) gives the client enough time to respond before the next ping is due.

## Why

If `pingPeriod >= pongWait`, the server's write-deadline check can fire before the client's pong arrives even on healthy connections — false disconnects. Too small a gap (e.g. 58/60) still works but leaves no margin for round-trip latency. 90% is the canonical Gorilla WebSocket example and widely used.

Pair this with a small write deadline (10s) — writes shouldn't block on slow clients; timeout and drop them fast so the event loop stays responsive.

## Evidence

- `server/internal/realtime/hub.go:87-99` — the three constants with rationale.
