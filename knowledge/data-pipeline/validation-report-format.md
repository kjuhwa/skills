---
version: 0.1.0-draft
name: validation-report-format
summary: Structured validation report — test results, failure analysis, performance metrics, recommendations
category: data-pipeline
confidence: medium
tags: [evolver, data-pipeline, validation, report, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/validationReport.js
imported_at: 2026-04-18T00:00:00Z
---

# Canonical validation report shape

After canary/validation runs, emit a stable JSON structure so downstream policy, dashboards, and archival all agree on the schema.

```jsonc
{
  "run_id": "…",
  "ts": "2026-04-18T00:00:00Z",
  "test_count": 42,
  "pass": 39,
  "fail": 3,
  "duration_ms": 5821,
  "errors": [
    { "type": "assertion", "frame": {...}, "hash": "…" }
  ],
  "perf": { "latency_p95_ms": 120, "rss_peak_mb": 180 },
  "verdict": "promote | reject | inconclusive",
  "recommendation": "rerun_with_seed=… | hold_for_review | accept"
}
```

## Why one canonical shape

- Policy engines consume it without per-test parsers.
- Diff-friendly across runs.
- Extensible — new fields can be added without breaking older consumers.

## Reuse notes

Version the schema (`schema_version: 3`) and pin consumers to a compatible range. The `verdict` is the contract; everything else is context.
