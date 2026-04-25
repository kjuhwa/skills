---
version: 0.1.0-draft
name: fan-out-fan-in-with-bulkhead
description: "Fan-out parallel within stage + fan-in barrier between stages, bulkhead-isolated workers prevent cross-contamination"
category: workflow
tags:
  - fan-out
  - fan-in
  - bulkhead
  - stage-parallel
  - barrier

composes:
  - kind: skill
    ref: workflow/bulkhead-data-simulation
    version: "*"
    role: isolation-shape-baseline
  - kind: skill
    ref: design/bulkhead-visualization-pattern
    version: "*"
    role: visualization-reference
  - kind: knowledge
    ref: pitfall/bulkhead-implementation-pitfall
    version: "*"
    role: counter-evidence

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "the fan-in barrier is described as synchronous regardless of fan-out worker count"
---

# Fan-Out / Fan-In with Bulkhead Isolation

> A pipeline where each stage internally fan-outs to N parallel workers and fan-ins at the next stage's barrier. Workers in one stage are bulkhead-isolated from each other (no shared mutable state, separate resource pools). Distinct from `parallel-build-sequential-publish` (which has no per-stage barriers) and from generic parallel-map (which lacks bulkhead).

<!-- references-section:begin -->
## Composes

**skill — `workflow/bulkhead-data-simulation`**  _(version: `*`)_
isolation-shape-baseline

**skill — `design/bulkhead-visualization-pattern`**  _(version: `*`)_
visualization-reference

**knowledge — `pitfall/bulkhead-implementation-pitfall`**  _(version: `*`)_
counter-evidence

<!-- references-section:end -->

## When to use

- Multi-stage pipeline where each stage benefits from parallelism but downstream depends on all upstream completing
- Worker failure should not cascade into peer workers (resource isolation matters)
- Wall-clock dominated by the slowest worker per stage, not by serialization

## When NOT to use

- Single-stage map-reduce (just use parallel-map)
- Workers have natural inter-dependencies within a stage (use saga)
- Resource contention is acceptable / desirable (e.g. shared connection pool by design)

## Shape

```
stage 1                stage 2                stage 3
─────                  ─────                  ─────
worker A1 ──┐        worker A2 ──┐         ...
worker B1 ──┼─► barrier ─► worker B2 ──┼─► barrier ─► ...
worker C1 ──┘        worker C2 ──┘
            ▲                       ▲
       fan-in (sync)          fan-in (sync)

each worker has its own resource pool (bulkhead) — no sharing within stage
```

## Glue summary (net value added)

| Added element | Where |
|---|---|
| Bulkhead isolation: per-worker resource quota, separate connection pools, no shared mutex | Worker init |
| Fan-in barrier is synchronous — next stage starts only after ALL workers in current stage finish (or fail explicitly) | Stage boundary |
| Single-worker failure does NOT abort peers in same stage; failure is logged and the barrier accounts for it | Failure handling |
| Stage-level retry policy: retry the whole stage (re-fan-out) vs retry only failed workers — must be explicit | Stage policy |

## Known limitations

- Synchronous barrier means stage latency = max(worker latency); slow worker is the bottleneck
- Bulkhead isolation roughly multiplies resource cost by worker count
- Cross-stage retry decisions need careful policy — too lax wastes work, too strict abandons partial success

## Provenance

- Authored 2026-04-25, pilot in 10-technique batch
- Sibling pilots: linear (#1), saga (#5), backpressure (#6)
