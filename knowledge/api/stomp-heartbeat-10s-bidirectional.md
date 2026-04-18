---
version: 0.1.0-draft
tags: [api, stomp, heartbeat, 10s, bidirectional]
name: stomp-heartbeat-10s-bidirectional
description: STOMP broker heartbeat set to 10s/10s (client↔server) is a reasonable default for detecting dead WebSocket sessions within ~20s
category: api
confidence: high
source:
  kind: project
  ref: lucida-realtime@336a1e2
---

# STOMP 10s/10s Heartbeat

## Fact
`WebSocketConfig` sets `setHeartbeatValue(new long[]{10_000L, 10_000L})` on the broker registry, with a matching `TaskScheduler` bean. Both directions send a heartbeat every 10s; a missed heartbeat implies dead peer within ~20s.

## Why
Without a heartbeat, a silently-dropped TCP connection (NAT rebind, laptop sleep, load balancer idle timeout) leaves the server holding a zombie session — still consuming routing state and, with this project's Reactor router, still holding an upstream subscription.

10s is the industry default: low enough for sub-minute detection, high enough to avoid heartbeat traffic dominating low-rate channels.

## Evidence
- `WebSocketConfig.configureMessageBroker`: `.setHeartbeatValue({10000, 10000}).setTaskScheduler(heartbeatScheduler())`.
- Commit `0afee71`: "heart-beat 설정 추가 (10초 주기)".

## How to apply
For any Spring STOMP broker:
1. Always register a `TaskScheduler` bean when enabling heartbeats. Without it, Spring logs a warning and heartbeats silently do nothing.
2. Set the same value on the client (JS stompjs: `incomingHeartbeat: 10000, outgoingHeartbeat: 10000`). Asymmetric values lead to one-sided detection.
3. If deploying behind a load balancer with idle-connection timeout (e.g. ALB 60s), ensure heartbeat < timeout. 10s << 60s is comfortable.

## Counter / Caveats
- On very slow mobile links, 10s can false-positive. Raising to 20–30s is safe if your LB idle timeout is higher.
- Heartbeats prevent LB idle-kills as a side effect — do not rely on this for anti-idle; configure the LB explicitly.
- In-browser tab throttling (background tab) can suspend heartbeat sends on some browsers — expect reconnect on tab focus.
