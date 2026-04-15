---
name: scouter-three-tier-architecture
summary: Scouter APM enforces strict agent → server → client separation, with an optional standalone HTTP webapp for horizontal scaling of query load
category: arch
confidence: high
source_type: extracted-from-git
source_url: https://github.com/kjuhwa/scouter
source_ref: master
source_commit: 126bb19f07d1fe4fe915eb408c381e2c140cc94c
source_project: scouter
tags: [apm, architecture, tiered, scouter]
---

## Fact

Scouter is a three-tier open-source APM: (1) agents (Java / Host / Batch) are lightweight collectors embedded in or beside monitored processes, (2) the server is the stateful authority that ingests pack streams (UDP 6100, TCP 6101), aggregates metrics, stores XLogs on disk, and runs plugins, (3) clients (Eclipse RCP desktop + optional webapp HTTP API on port 6188) are read-only query interfaces. This separation lets agents run inside restricted production zones without exposing DB-like data, and lets HTTP/query load be scaled independently from the collector by running extra webapp instances pointing at the same server.

## Evidence

- `README.md` — project pitch / architecture overview
- `scouter.document/index.md` — doc index grouping server / client / tech
- `scouter.document/tech/Web-API-Guide.md` — optional webapp tier

## How to apply

When evaluating APM-like systems or designing one: expect this agent / server / client split. It's enforced for a reason — agent-as-library inside the monitored process wants minimal dependencies, server-as-authority wants stateful storage it alone controls, client-as-viewer is safe to give broader read permissions. Conflating tiers (putting a DB query API in the agent, or persistence in the client) breaks the security model.
