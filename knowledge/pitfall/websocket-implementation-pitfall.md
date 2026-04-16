---
name: websocket-implementation-pitfall
description: Common WebSocket bugs around backpressure, reconnect storms, and frame boundaries
category: pitfall
tags:
  - websocket
  - auto-loop
---

# websocket-implementation-pitfall

The most common WebSocket bug in visualization tools is treating `send()` as synchronous delivery. `ws.send()` only queues into `bufferedAmount`; if the consumer is slow, memory grows unbounded and the tab eventually dies. Frame inspectors that replay captured traffic are especially vulnerable because they often flush thousands of frames in a tight loop. Always check `bufferedAmount` before sending and apply backpressure (drop, coalesce, or pause) when it exceeds a threshold like 1MB.

Reconnect logic is the second trap. A naive `onclose → new WebSocket()` loop causes a thundering-herd reconnect storm when a server restarts — every client reconnects in the same 10ms window and immediately overloads the server, triggering another cascade. Always use exponential backoff with jitter (e.g., `min(cap, base * 2^attempt) * (0.5 + random())`) and reset the attempt counter only after the connection has been stable for some duration, not immediately on open — otherwise a flapping server produces attempt=1 resets forever.

Third: frame boundaries are not message boundaries. A single logical message can span multiple frames via the FIN bit and continuation opcode 0x0, and most browser APIs hide this by concatenating for you — but raw inspectors must handle it explicitly. Similarly, text frames must be valid UTF-8 per spec; many servers will close with code 1007 on invalid UTF-8, which manifests as a mysterious disconnect that doesn't show up until non-ASCII payloads appear in production.
