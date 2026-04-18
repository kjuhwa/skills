---
version: 0.1.0-draft
tags: [pitfall, mongo, direct, connection, flag]
name: mongo-direct-connection-flag
description: MongoDB datasource connectionString requires directConnection=true in this deployment
type: pitfall
category: pitfall
source:
  kind: project
  ref: lucida-builder-r3@97ceb3a1
confidence: medium
---

# Fact
MongoDB datasource connection strings in `lucida-builder-datasource` require `directConnection=true`. Without it, the driver attempts replica-set discovery and fails against the deployed topology.

**Why:** The target MongoDB is reachable as a single node from the builder service; the driver's default replica-set discovery picks hosts that the builder cannot route to, producing timeouts that look like the DB is down.

**How to apply:**
- When composing/adjusting a Mongo URI for a datasource, include `directConnection=true`.
- If a newly added Mongo datasource times out on health check but a `mongosh` probe from the same host succeeds, this flag is the first thing to check.
- Health-check thread buildup can also accompany mis-routed Mongo connections — monitor thread counts if the flag change doesn't immediately recover the system.

## Evidence
- Commit `57d4346c` ("fix: add directConnection=true to MongoDB DataSource connectionString").
- Commit `336641c2` (Mongo health-check thread increase under periodic datasource reset).
