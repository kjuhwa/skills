---
version: 0.1.0-draft
tags: [domain, topresource, immediate, generation, invariant]
name: topresource-immediate-generation-invariant
description: In report immediate-generation, the topResource flag decides whether to query by resource-id (fast path) or the full conf-id set (slow path)
type: domain
category: domain
source:
  kind: project
  ref: lucida-report@35a2a06
confidence: medium
---

## Fact
For "generate now" (immediate, user-triggered) report requests against a device tree, the `topResource` flag on the target definition changes the query shape entirely:

- `topResource = true`  → only the top-level resource IDs are used. Fast, bounded result set.
- `topResource = false` → all descendant `confIds` under the target group are expanded. Potentially thousands of IDs, slow.

Immediate generation **must** use `topResource = true`. Scheduled generation may use either.

## Why
Immediate generation blocks a user-facing HTTP call. Expanding the full tree for large SYSTEM groups caused request timeouts and duplicate retries. The project explicitly scoped immediate generation to top-resources only (see commit history on issue #107215).

## How to apply
- When writing immediate-generation code paths, explicitly filter targets by `topResource=true` before handing the ID set to the generator.
- When reviewing a new report type, ask: "Can this be generated synchronously against all descendants, or does it need the topResource fast path?" — default to fast path unless proven otherwise.
- Do not silently fall back from fast→slow path; surface the choice in the request DTO so API consumers understand the performance profile.

## Evidence
- Commits `bc6c56d`, `c2d3c97`: `issue #107215 보고서 즉시 생성 오류 수정.  대상 장비를 top 리소스만 적용함.`
- Field `FieldName.TOP_RESOURCE` referenced from `OzReportGenerator` when branching SMART group queries.

## Counter
- This is a product-specific performance invariant, not a universal rule. If your report engine and query path can handle the full expansion in < a few seconds, the distinction doesn’t matter and the flag can go away.
