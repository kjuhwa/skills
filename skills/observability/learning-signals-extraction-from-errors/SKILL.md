---
name: learning-signals-extraction-from-errors
description: Extract structured learning signals (error type, stack, context) from execution failures
category: observability
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [evolver, observability, error-analysis, learning]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/learningSignals.js
imported_at: 2026-04-18T00:00:00Z
---

# Structured learning signals from errors

Wrap every execution failure in a structured record that downstream analysis can bucket:

```jsonc
{
  "type": "assertion" | "syntax" | "timeout" | "permission" | "env",
  "message": "…",
  "frame": { "file": "…", "line": 42, "fn": "…" },
  "context": { "input_hash": "…", "duration_ms": 132, "env": "…" }
}
```

## Mechanism

- Categorize via a heuristic cascade on `error.name`, `error.code`, and stack patterns.
- Pull the innermost user-owned frame from the stack (strip node internals).
- Attach the caller's input hash or redacted context so similar failures cluster.
- Emit to the event log; never swallow the underlying error.

## When to reuse

Self-healing agents, flaky-test detectors, incident triage tools — any system that benefits from a uniform error shape across heterogeneous failure modes.
