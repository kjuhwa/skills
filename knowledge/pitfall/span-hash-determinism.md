---
version: 0.1.0-draft
tags: [pitfall, span, hash, determinism]
name: span-hash-determinism
description: Span-dedup hash must be deterministic and stable; changing the hash definition produces duplicate rows during rollout and poisons historical joins.
type: pitfall
category: pitfall
source:
  kind: project
  ref: lucida-domain-apm@11c3887f
confidence: medium
---

**Fact.** When an observability pipeline dedupes spans by a content hash (commonly derived from `traceId + spanId + startTime + parentId + …`), any change to the hash's field set or the serialization of those fields causes duplicates during the rollout window as both versions coexist, and breaks joins against previously-stored spans.

**Why.** In lucida-domain-apm, commit `#117248` ("Span 수신 시 Hash 값 정의 시 중복 데이터 발생") tracked a real incident where a hash-definition change produced duplicate rows in production. Dedup keys behave as an implicit external contract of the ingestion pipeline, even when the hash field is "internal" to one service — downstream queries and joins rely on stability.

**How to apply.**
- Treat the hash function as schema: versioned, reviewed, explicitly migrated.
- To change the hash: introduce `spanHashV2` in parallel, dual-write, cut the reader over, then retire the old column. Never swap in place.
- Unit-test hash stability against a frozen corpus of spans — if unrelated changes break the test, someone added or re-ordered a field.
- Canonicalize before hashing (sort fields, normalize nulls) so map-iteration order changes can't alter the hash.

**Counter / Caveats.** Cryptographic hashes (SHA-256) are overkill and slow; xxHash / Murmur3 usually suffice for dedup. If the hash is used as a MongoDB `_id`, a collision silently drops data — pick a hash size and field set so collisions are < 1 in 10⁹ for your volume. OpenTelemetry already provides `traceId + spanId` as a unique span identifier; prefer that when your only goal is identity, and reserve content hashes for content-equality detection.
