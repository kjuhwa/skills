---
version: 0.1.0-draft
tags: [domain, root, span, error, propagation]
name: root-span-error-propagation
description: A trace's root-span isError flag must aggregate descendant span errors; otherwise scatter and list views disagree about which traces errored.
type: domain
category: domain
source:
  kind: project
  ref: lucida-domain-apm@11c3887f
confidence: medium
---

**Fact.** In a trace, the root span's `isError` is not "did the root span throw" — it is the trace-level error indicator. If any descendant span errored (DB call failed, downstream HTTP 5xx) but the root was written without consulting children, scatter charts and trace-list views disagree: the list says "ok" because the root is green, the scatter says "error" because it aggregates descendants.

**Why.** Users hit the same trace from multiple dashboards and expect a single truth. Commit `#117082` in lucida-domain-apm ("위젯 스캐터 챠트 isError 하위 span error 반영") fixed exactly this — the list API read `root.isError` directly, while the scatter API re-derived from descendants, producing inconsistent colors for the same trace.

**How to apply.**
- When finalizing a trace (at root-span commit), compute `root.isError = any(span.isError for span in trace)` before writing.
- All downstream views (list, scatter, stats, TopN) must read the same pre-computed field, never re-derive from a subset.
- If both "root failed" and "trace has errors" are user-visible, use *two* fields (`rootError`, `anyError`) rather than overloading one.
- Add a cross-API test that loads a trace through every surface and asserts identical error state.

**Counter / Caveats.** OpenTelemetry's Span Status is strictly per-span; a trace-level flag is an application-layer concept — document it explicitly in your domain model. Some errors are "expected" (4xx from user input); filtering those is a product decision, not a schema one. Keep the raw aggregate and filter at query time. A span with an exception event but `Status.OK` is not an error under OTel semantics; decide your policy once and apply it consistently.
