---
version: 0.1.0-draft
tags: [pitfall, history, view, yearly, partition]
name: history-view-yearly-partition-pitfall
category: pitfall
summary: A history/reporting view or materialized collection created with a year-bounded clause silently stops returning rows when the calendar year rolls over
source:
  kind: project
  ref: lucida-notification@release-10.2.4_2
  evidence:
    - "commit 34ea82c — '통보이력 view가 2024년도에 생성되어서 2025년도에 대한 통보 데이터가 view에 추가가 안되는 문제 수정'"
    - "commit 1ec7fa2 / b8149b9 — history view creation bug revert history"
confidence: high
---

## Fact
A notification-history view was created in 2024 with a year-bounded filter (effectively `WHERE year = 2024` or a year-suffixed collection name). On 2025-01-01, newly inserted rows went into 2025 but the view kept reading from the frozen year → the UI showed zero new history.

## Why it bit us
The original DDL was written at project start in the current year and never re-examined. No test reproduced a calendar-rollover scenario. The view "worked" in every environment until production crossed midnight on New Year's Eve.

## How to apply
- Whenever you see a year, month, or quarter literal in schema / view / Mongo collection name, treat it as a bug waiting for the next rollover. Replace with a dynamic resolver, or schedule a rotation job.
- For Mongo `collectionName = "notification_history_" + year` patterns, the read-side query must pass the target year from the request, not cache a value at bean-init.
- Add a CI time-travel test (`Clock.fixed(2026-01-01)`) for any code that resolves a year/month suffix.

## Counter / Caveats
- If the year bound is a legal/retention requirement (e.g. "history older than N years must be archived"), don't remove it — instead make the rotation explicit and alarmed.
- Don't confuse this pitfall with Mongo TTL indexes; those delete, not hide.
