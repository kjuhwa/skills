---
name: websocket-data-simulation
description: Generate realistic WebSocket traffic with per-channel message pools, randomised user identities, and jittered bot intervals for offline demos.
category: workflow
triggers:
  - websocket data simulation
tags:
  - auto-loop
version: 1.0.0
---

# websocket-data-simulation

Define a fixed roster of virtual users (name + accent colour) and a map of channels to message pools — short, domain-flavoured strings like "CI is green" or "PR merged." On each bot tick, pick a random channel and a random user, then push a message into that channel's history array. Cap the array (e.g. 80 entries via `shift()`) so memory stays bounded during long-running demos. User-initiated messages go to the active channel immediately; a simulated "reply" fires after a jittered delay (`600 + Math.random() * 1400 ms`) to mimic network round-trip plus human think time.

The bot tick itself runs on `setInterval` with a base period plus random jitter (`3000 + Math.random() * 4000 ms`). This avoids the uncanny regularity of a fixed-rate timer and produces traffic that looks organic in demos. Seed the history with 3-5 messages at startup so the UI is never empty on first render. Each message carries a timestamp formatted at creation time, not render time, so scrollback stays consistent even when the user switches channels.

For the handshake and frame layer, pre-author literal protocol strings — the HTTP Upgrade request, 101 response, text-frame bit layout, PING/PONG payloads, and CLOSE sequence — and expose them through a clickable phase timeline. This gives presenters drill-down detail without requiring a live server. The pattern generalises: any protocol with discrete phases (TLS, gRPC stream setup, MQTT CONNECT/CONNACK) can reuse the same `phases[]` array → timeline → detail-pane structure.
