---
version: 0.1.0-draft
tags: [pitfall, time, unit, consistency]
name: time-unit-consistency-us-ms-ns
description: Mixed time units (ns/μs/ms) across OTLP ingestion, storage, filters, and UI are a recurring high-severity bug class — pick one canonical internal unit and convert only at edges.
type: pitfall
category: pitfall
source:
  kind: project
  ref: lucida-domain-apm@11c3887f
confidence: high
---

**Fact.** Observability / metrics systems that ingest OpenTelemetry (nanoseconds), store durations (often microseconds), render charts (milliseconds), and accept user filters (milliseconds or seconds) repeatedly ship off-by-1000 bugs at the conversion boundaries. Most slip through unit tests because the test inputs are coincidentally round.

**Why.** The same unit-mismatch root cause shipped repeatedly in lucida-domain-apm: `#119255` (DB Slow Top5 applied `ms→μs` that had already been applied upstream — double conversion); `#118169` (duration filter compared user-ms against stored-μs); `#117495` series (unit changes for heap/GC/perm). These are hard to catch in review because the arithmetic looks reasonable — nothing on the page says what unit is on each side.

**How to apply.**
- **Pick one canonical internal unit per quantity class** (e.g. all trace durations in μs, all presentation values in ms). Document it at the top of the domain model.
- **Convert only at ingress and egress.** Not in the middle of the pipeline. The conversion site becomes the only place to audit.
- **Encode the unit in the field name** when mixing is unavoidable: `startTimeUs`, `durationMs`. A bare `duration` field is a future bug.
- **Test with non-round numbers** (e.g. 1,234,567 ns) so a missing or extra `×1000` fails visibly.
- **Before adding a conversion, grep the call chain** to confirm the value isn't already in the target unit.

**Counter / Caveats.** OpenTelemetry's wire format is ns; MongoDB native `Date` is ms; t-digest stores whatever you hand it. There is no universal default. `System.currentTimeMillis()` vs `System.nanoTime()` mix is especially dangerous — the latter is monotonic but not wall-clock; subtracting them silently yields garbage. Hardcoded `1_000_000` / `1000` constants in code are almost always unit conversions in disguise and drift when specs change.
