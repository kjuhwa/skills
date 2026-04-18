---
version: 0.1.0-draft
tags: [pitfall, mongodb, single, node, directconnection]
name: mongodb-single-node-directconnection
description: MongoDB clients must pass directConnection=true when connecting to a single-node replSet, otherwise they hang on primary discovery
category: pitfall
source:
  kind: project
  ref: lucida-for-docker@1cfd104
confidence: high
---

# MongoDB single-node replSet needs `directConnection=true`

## Fact
When MongoDB is started with `--replSet` but runs as a single node (dev/QA topology), drivers using the default SRV/seedlist behavior will attempt primary discovery across the (nonexistent) replica set and hang or time out. The connection URI must include `directConnection=true`.

## Evidence
- Commit `1cfd104`: `nkiaai-481 Fix : MongoDB 단일노드 환경에서 directConnection 옵션 추가`.

## How to apply
- In any `MONGODB_URI` / `spring.data.mongodb.uri` that may point at a single-node replSet, append `?directConnection=true` (or `&directConnection=true` if other params exist).
- Multi-node RS deployments should **not** set this flag — it disables replica-set awareness and prevents automatic failover.

## Counter / Caveats
Not a Docker-specific bug — it's a driver behavior baked into the MongoDB connection-string spec, but it surfaces loudly in containerized dev envs where ops run a 1-node RS to mirror prod's replica semantics without the cost.
