---
version: 0.1.0-draft
name: multi-domain-split-via-domain-mapping
description: Split multi-domain screens via a domain-mapping manifest — one OpenAPI file per owning domain
category: arch
source:
  kind: project
  ref: polestar10-auto-pipeline@b0f1c9d
confidence: medium
linked_skills: []
tags: [multi-domain, openapi, ownership, parallel-dev, cross-domain]
---

**Fact:** A single screen often consumes APIs from several backend domains (e.g. a list API from domain-A, enrichment data from domain-B, user info from domain-C). A single OpenAPI file blurs ownership and blocks parallel development. Solution: emit a `domain-mapping.yaml` listing each needed API with `{path, method, domain, project, owner, crud_type}`, then split the OpenAPI into one file per domain under `specs/{domain}/openapi/`. Each file uses that domain's URL prefix and schema set.

Cross-domain data (A's response needs B's field) is an **explicit per-API decision** recorded in the mapping:
- `FE-side composition` — FE fans out and joins.
- `BFF` — owning BE calls the other BE via RPC/HTTP.
- `event sync` — sidestep with async replication.

**Why:** Treating multi-domain APIs as one artifact forced one developer to own cross-team work, or created merge conflicts in a shared spec. Splitting by domain matches the repo boundary and lets each domain dev generate and review independently.

**How to apply:**
- Detect multi-domain during extraction (path prefixes differ, or keywords match multiple registry entries).
- Produce the mapping manifest first; get human sign-off on ownership before emitting per-domain specs.
- Skip the whole ceremony for single-domain screens — don't pay the cost when the whole feature lives in one repo.
- Make cross-domain resolution a required field on any API that references another domain's data, so the strategy is explicit not implicit.

**Evidence:**
- Internal multi-domain-design doc §2 (mapping structure), §3.2 (cross-domain resolutions), §7 (single-domain fast path).
