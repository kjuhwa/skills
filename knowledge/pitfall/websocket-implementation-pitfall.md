---
name: websocket-implementation-pitfall
description: Common WebSocket mistakes: missing masking, ignored close codes, no heartbeat, reconnect storms
category: pitfall
tags:
  - websocket
  - auto-loop
---

# websocket-implementation-pitfall

The most frequent WebSocket bugs are protocol-level rather than logical. Browser clients MUST mask every frame sent to the server (RFC 6455 §5.3) — a server that accepts unmasked client frames is non-compliant and will break against strict proxies. Conversely, servers MUST NOT mask frames sent to the client; doing so causes Chrome/Firefox to drop the connection with code 1002. Custom WS implementations often get this backwards and only discover it when traffic crosses a compliant intermediary.

Close-code handling is the second landmine. Many apps treat any `onclose` as equivalent and blindly reconnect, but codes 1008 (policy violation), 1011 (server error), and 4000-4999 (app-defined) usually mean "do not retry." Combine that with no exponential backoff and you get a reconnect storm that hammers the server during an outage — the classic "thundering herd after deploy" incident. Always gate reconnects on a code allowlist (1001, 1006, 1012, 1013) with jittered backoff starting at ~1s and capped at ~30s.

Finally: no heartbeat = silent half-open sockets. TCP keepalive defaults to 2 hours on Linux, so a NAT/load-balancer idle timeout (typically 60-350s) will silently drop the connection with neither side noticing until the next send fails. Ship a ping/pong at ~25-30s intervals from the client, and treat a missed pong within 2 intervals as a dead connection — don't rely on the OS or the framework to tell you.
