---
version: 0.1.0-draft
name: a2a-protocol-agent-to-agent-knowledge-exchange
summary: Protocol for agents to exchange evolution assets, signal confidence, and federate knowledge
category: integration
confidence: high
tags: [evolver, integration, a2a, federation, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/a2aProtocol.js
  - src/gep/a2a.js
  - scripts/a2a_export.js
  - scripts/a2a_ingest.js
imported_at: 2026-04-18T00:00:00Z
---

# A2A — Agent-to-Agent Knowledge Exchange

A2A is Evolver's federation layer. Agents export eligible genes/capsules (after passing broadcast gates), and import remote assets as low-trust candidates.

## Trust hierarchy

1. Locally validated (full confidence)
2. Trusted peer (confidence × ~0.9)
3. Untrusted external (confidence × ~0.6)

External assets start at the bottom of the ladder. They earn promotion by accumulating a success streak on the local node — same mechanism as native candidates.

## Message shapes

- `HELLO` — identity + inventory (counts, schema version).
- `PUBLISH` — one asset with `content_hash`, `schema_version`, `body`.
- `DECISION` — `accept | quarantine | reject` response back to the sender.

## Why it matters

This turns isolated agents into a learning mesh without a central registry. The publish gates + streak elevation keep the mesh noise-resistant: even if a peer is compromised or buggy, its bad assets can't silently pollute others.

## Reuse notes

The protocol doesn't require HTTP — a shared JSONL mailbox or Kafka topic works equally well. Keep the wire format JSON, keep the trust math explicit and env-configurable.
