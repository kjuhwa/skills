---
version: 0.1.0-draft
name: local-proxy-auth-isolation
summary: A local-HTTP proxy process owns all hub credentials and sync state; the business agent only speaks to `127.0.0.1`. Credential rotation, retries, and offline mode become the proxy's problem, not the agent's.
category: architecture
confidence: medium
tags: [proxy, auth, isolation, hub-sync, local-ipc]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 4c51382092f9cb125d3ec55475861ead8d1463a6
source_project: evolver
imported_at: 2026-04-18T02:45:00Z
---

# Local Proxy as Auth Isolation Boundary

## Core idea

Split the system into **two trust zones**:

- **Agent zone** — business logic. Knows nothing about hub auth. Talks only to `http://127.0.0.1:<proxy_port>`. Works offline (errors are just "proxy unreachable").
- **Proxy zone** — local process. Holds the hub token, node ID, cursor state. Does heartbeat, retries, background sync. Its public surface is localhost HTTP; its private surface is whatever the remote hub speaks.

This is the same shape as the AWS SDK instance metadata service, k8s `kubelet`'s local API, and Tailscale's local daemon — in each case, the "real" credentials live in a local sidecar and the app talks to localhost.

## Why it's worth the extra process

- **Credential blast radius.** A compromised agent process leaks no hub token — it never held one.
- **Offline path is free.** The agent's code has no "am I online?" branches; the proxy queues and retries.
- **Swap hubs without code changes.** Point the proxy at a different hub; agent code is untouched.
- **Cross-language.** Agent and proxy don't need to be the same runtime; they just speak localhost HTTP + JSON.
- **Shared session across processes.** Two local agents on the same host can share a single hub session via one proxy — no second OAuth dance.

## Discovery

Publish the proxy's coordinates to a well-known on-disk location so the agent doesn't need compile-time knowledge of the port:

```json
// ~/.<project>/settings.json
{ "proxy": { "url": "http://127.0.0.1:19820", "pid": 12345, "started_at": "..." } }
```

Agent reads this file on boot. If missing or the PID isn't alive, agent either spawns the proxy or runs in offline mode.

## Failure modes to plan for

- **Proxy crash.** Agent should tolerate `ECONNREFUSED` as "offline" rather than hard-failing.
- **Stale settings file** (proxy was killed, PID reused). Always validate by `GET /proxy/status` before trusting the cached URL.
- **Two proxies contending for the same port.** Treat the settings file as the lock; the losing proxy exits.

## Source

- `evolver` uses this exact shape: `A2A_HUB_URL` never leaves the proxy; the agent side only reads `EVOMAP_PROXY_PORT`. See the Proxy Mailbox section of its SKILL.md for the wire contract.
