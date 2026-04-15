---
name: traefik-2.11-requires-explicit-idletimeout
description: Traefik 2.11 silently drops idle backend connections without an explicit idleTimeout on the entrypoint/serversTransport
category: pitfall
source:
  kind: project
  ref: lucida-for-docker@966c89e
confidence: high
---

# Traefik 2.11 needs explicit `idleTimeout` on gRPC / long-poll entrypoints

## Fact
On Traefik 2.11, backend connections for long-lived / streaming traffic (gRPC, SSE, websocket) can be reaped before the client considers them idle. The symptoms are intermittent disconnects and "upstream RST" errors under low-traffic conditions.

Setting both `transport.respondingTimeouts.idleTimeout` on the entrypoint **and** `serversTransport.forwardingTimeouts.idleConnTimeout` resolves it.

## Evidence
- Commit `966c89e`: `fix: add idle timeout for traefik 2.11`.
- Compose CLI flags in `dc-platform-traefik.yml`:
  - `--entryPoints.kcm-grpc.transport.respondingTimeouts.idleTimeout=300s`
  - `--serversTransport.forwardingTimeouts.idleConnTimeout=300s`

## How to apply
For any Traefik 2.11+ deployment with gRPC or long-poll entrypoints, set both timeouts explicitly. 300s is the observed working default; tune upward for long-running RPC streams. Set `readTimeout=0` on streaming entrypoints so Traefik doesn't cut the client side.

## Counter / Caveats
Not observed on Traefik 2.10. May be a regression of 2.11 HTTP/2 connection pooling — revisit after upgrading past 2.11.x and remove the workaround if the defaults become sane.
