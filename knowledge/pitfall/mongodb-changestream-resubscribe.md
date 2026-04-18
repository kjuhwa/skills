---
version: 0.1.0-draft
name: mongodb-changestream-resubscribe
description: MongoDB change streams do not self-heal after network hiccups or replica-set elections; must be explicitly stopped and restarted to resume receiving events
category: pitfall
source:
  kind: project
  ref: lucida-alarm@d6ae7d27
confidence: high
linked_skills:
  - mongodb-changestream-field-filter
tags: [mongodb, changestream, resilience, reconnect, resumetoken]
---

**Fact:** A MongoDB change stream interrupted by a network blip or replica-set primary election goes **silent** — the app keeps running, no exception surfaces, just no events arrive. Detection is quieter than a crash. The driver's auto-reconnect does not re-establish the cursor. You must catch the underlying exception, call `stop()` then `start()`, and on leader-election reconnect treat it as a fresh subscription rather than trying to resume from a stale `resumeToken`.

**Why:** Change stream cursors live on the `oplog` of the current primary; a primary change invalidates the cursor's context. Resuming with a token from before the election may succeed, fail, or silently miss events depending on the oplog window.

**How to apply:**
- Wrap listener loops with exception handling that calls `stop()` + `start()` on failure.
- Consolidate per-collection streams into one stream-per-manager where possible — fewer failure modes to recover.
- On resubscription, accept that you may re-process recent events; design handlers to be **idempotent**.
- Add structured logging around start/stop so silent-silence periods are visible via log search.
- Pair with `mongodb-changestream-field-filter` to cheaply drop the re-processed events you already handled.

**Evidence:**
- Commit `1f5bc475` — "change stream 로직 수정"
- Commits `8f92e176`, `1f4fd9cd` — "change stream 로깅 추가"
- Commit `06708869` — "하나의 change stream 으로 처리. 재연결시 캐시 삭제/로딩 제거."
- `service/changestream/PolicyChangeStreamManager.java`.
