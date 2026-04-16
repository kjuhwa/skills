---
name: websocket-implementation-pitfall
description: Common failure modes in WebSocket apps — reconnection, backpressure, frame-type confusion, and close-handshake races.
category: pitfall
tags:
  - websocket
  - auto-loop
---

# websocket-implementation-pitfall

The most frequent production pitfall is missing reconnection logic. All three demo apps assume a permanently healthy connection (`● Connected` is hardcoded). In reality, mobile networks, load-balancer idle timeouts (often 60 s), and server deploys sever WebSocket connections silently. Without an exponential-backoff reconnect loop that re-subscribes to channels and replays missed messages (or requests a snapshot), users see a frozen UI with no error. Heartbeat frames (PING/PONG at opcode 0x9/0xA) must be actively sent — the handshake anatomy app shows them but the chat simulator never implements them, which means a proxy or ALB sitting between client and server will close the socket after its own idle timeout.

A second class of bugs comes from ignoring backpressure. The packet visualiser spawns frames on a fixed timer and the chat simulator writes to the DOM on every bot tick. At scale, a burst of inbound frames can queue thousands of `onmessage` callbacks before the browser can paint, causing jank or OOM. Production code must check `WebSocket.bufferedAmount` before calling `send()`, and on the receive side, decouple parsing from rendering via a ring buffer or `requestAnimationFrame`-gated flush. The flat packet array in the visualiser is actually a lightweight version of this — but it never pauses the source, so a real feed could still overwhelm it.

Finally, the close handshake is a two-phase exchange (client CLOSE → server CLOSE echo → TCP teardown) that developers often short-circuit by calling `socket.close()` and immediately discarding the reference. If the server sends final data frames between receiving the CLOSE and echoing it, those frames are lost. The anatomy app documents this sequence but none of the apps guard against it in code. In practice, listen for `onclose` with its `code` and `reason`, distinguish clean closure (1000) from abnormal ones (1006 = no close frame received), and only trigger reconnection on abnormal codes.
