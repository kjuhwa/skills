---
version: 0.1.0-draft
name: strangler-fig-traffic-shifting
description: "Strangler-fig migration: dual systems with shifting traffic ratio over time, monitor + auto-revert if KPIs degrade"
category: arch
tags:
  - migration
  - strangler-fig
  - traffic-shifting
  - parallel-systems
  - kpi-gate

composes:
  - kind: skill
    ref: workflow/strangler-fig-data-simulation
    version: "*"
    role: shape-baseline
  - kind: skill
    ref: backend/migration-processor-pipeline
    version: "*"
    role: data-migration-shape
  - kind: knowledge
    ref: pitfall/strangler-fig-implementation-pitfall
    version: "*"
    role: counter-evidence

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "the technique describes a TIME-AXIS pattern (traffic ratio shifts gradually) distinct from STRUCTURAL patterns"
---

# Strangler-Fig: Traffic Shifting Across Time

> Two systems run in parallel during the entire migration window. A dial controls what fraction of traffic each handles; the dial moves only forward (or pauses). Distinguished from blue-green deploy (instant cutover) and canary (small constant slice) by being a long-lived, gradually-evolving ratio rather than a momentary switch.

## When to use

- Replacing a long-lived production system where instant cutover is too risky
- The migration window measured in weeks/months, not hours
- KPI parity must be observed at every traffic ratio step before advancing

## When NOT to use

- Hot-fix or compatibility patch (blue-green is faster)
- Small percentage validation for a feature (canary is the right shape)
- New system has not yet handled any production-like load (ramp from 1% with monitor instead)

## Phase sequence

```
[old: 100%] → [old 95% / new 5%] → [old 80% / new 20%] → ... → [new: 100%] → [decommission old]
                  ▲                       ▲                            ▲
              KPI gate (every step)    auto-revert if regression   final cutover
```

## Glue summary (net value added)

| Added element | Where |
|---|---|
| Dial is monotonic — can pause but cannot reverse without explicit rollback decision | Traffic control |
| KPI gate at each step: error rate, p99 latency, downstream failure rate; auto-revert on regression | Per step |
| Old-system instrumentation MUST stay live until decommission — needed as A/B baseline | Throughout |
| Decommission step is its own gate, not a bonus side-effect of reaching 100% | End |

## Known limitations

- Long-running parallel systems double infra cost during the window
- Data divergence between old and new must be reconciled separately (see `paper/parallel-dispatch-breakeven-point` for related cost discussion)
- KPI definitions need agreement before start; mid-migration redefinition is a sign of poor planning

## Provenance

- Authored 2026-04-25, pilot in 10-technique batch
- Sibling pilots: #1-#8
