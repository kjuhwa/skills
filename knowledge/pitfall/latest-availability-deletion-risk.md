---
name: latest-availability-deletion-risk
version: 0.1.0-draft
tags: [pitfall, latest, availability, deletion, risk]
slug: latest-availability-deletion-risk
category: pitfall
summary: Latest-availability collection can lose data when upstream source is stale but not actually missing
confidence: high
source:
  kind: project
  ref: lucida-measurement@bc4ed72
links:
  - availability-ttl-punctuate-processor
---

# Fact
The "latest availability" materialized collection had a failure mode (#118163) where an availability record could be **removed** instead of kept, because the upstream processor treated silence-from-source as "no availability" rather than "no change". The fix hardens the streams processor to forward only when the value *changed*, and evicts on a wall-clock schedule rather than on every poll.

# Evidence
- Commit `c382ef2` (#118163) — "최근 가용성 컬렉션에 가용성 정보 제거되는 경우 방지"
- Commits `f633c6b`, `4598be3` (#108968/#108969) — availability retention + index work that preceded the regression

# How to apply
- Any "latest-X" materialized view must distinguish "no event" from "event with no change". Only the latter should leave the store untouched; the former **must not** trigger deletion.
- TTL cleanup belongs on a wall-clock `punctuate`, not on the event path.
- When building similar patterns (latest-alarm, latest-trait), replay this checklist before going live.

# Counter / Caveats
- If the upstream really does emit explicit "unavailable" tombstones, the logic must honor them — differentiate a tombstone record from absence-of-record.
