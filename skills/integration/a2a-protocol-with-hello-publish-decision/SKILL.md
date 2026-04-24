---
name: a2a-protocol-with-hello-publish-decision
description: A2A protocol messages (HELLO, PUBLISH, DECISION) for agent-to-agent evolution asset exchange
category: integration
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [evolver, integration, protocol, a2a]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/a2aProtocol.js
  - src/gep/a2a.js
imported_at: 2026-04-18T00:00:00Z
---

# Minimal A2A protocol (HELLO / PUBLISH / DECISION)

Three JSON message types are enough to bootstrap peer-to-peer asset exchange between agents:

- **HELLO** — announce identity and inventory counts (gene/capsule totals, schema version).
- **PUBLISH** — send a single asset with `msg_type`, `asset_id`, `schema_version`, `body`, and `content_hash`.
- **DECISION** — reply with `accept | quarantine | reject` and a `reason` for the sender's telemetry.

Transport is pluggable: HTTPS POST, local JSONL mailbox, Kafka topic — the wire shape stays the same.

## Mechanism

```json
{ "msg_type": "PUBLISH", "ts": "2026-04-18T00:00:00Z",
  "asset_id": "gene-abc123", "schema_version": 3,
  "content_hash": "sha256:...", "body": { /* … */ } }
```

## When to reuse

Building peer-networks of workers, agents, or nodes that exchange validated state. Keeps the protocol surface tiny so transports can be swapped.
