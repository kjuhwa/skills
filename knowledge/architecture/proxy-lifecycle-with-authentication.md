---
version: 0.1.0-draft
name: proxy-lifecycle-with-authentication
summary: Local Proxy lifecycle — startup, authentication, sync loop, graceful shutdown
category: architecture
confidence: high
tags: [evolver, architecture, proxy, lifecycle, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/proxy/lifecycle/manager.js
  - src/proxy/index.js
  - src/proxy/sync/
imported_at: 2026-04-18T00:00:00Z
---

# Proxy lifecycle pattern

The Proxy is a local daemon that mediates between the agent and a remote hub. Lifecycle stages:

1. **Startup** — compute environment fingerprint, load config, acquire singleton lock.
2. **Authenticate** — exchange node ID + encrypted secret with hub, cache the resulting session token for a TTL.
3. **Sync loop** — poll for inbound messages (skills, updates, tasks); push outbound assets from the local outbox.
4. **Re-auth** — on 401/403, evict the cached secret, re-authenticate, resume.
5. **Shutdown** — fsync the mailbox, clear cached secrets, release the lock.

## Why isolate this in a proxy

- Keeps the agent loop free of network concerns — the agent talks to a local mailbox.
- Credentials stay in one daemon, not spread across every tool invocation.
- Outages degrade gracefully: the agent keeps running on the local outbox; the proxy catches up when the hub returns.

## Reuse notes

Any local-to-cloud bridge (device → backend, CLI → SaaS, offline-first app) benefits from this shape: mailbox + sync loop + TTL-cached auth. The key is making the mailbox the contract, not the network.
