---
version: 0.1.0-draft
name: canary-rollout-with-auto-revert
description: "Canary rollout with auto-revert: gated traffic %, KPI monitor at each step, auto-rollback on regression"
category: devops
tags:
  - canary
  - rollout
  - auto-revert
  - kpi-gate
  - traffic-shifting

composes:
  - kind: skill
    ref: workflow/canary-release-data-simulation
    version: "*"
    role: canary-shape-baseline
  - kind: skill
    ref: backend/conditional-feature-flag-rollout
    version: "*"
    role: traffic-control-implementation
  - kind: knowledge
    ref: pitfall/canary-release-implementation-pitfall
    version: "*"
    role: counter-evidence

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "auto-revert is automatic on KPI threshold breach, not manual"
---

# Canary Rollout with Auto-Revert

> Traffic shifts to the new release in increments (1%, 5%, 25%, 50%, 100%) with KPI gates between steps. If a KPI regresses past threshold, the system auto-reverts the last step. Distinguished from strangler-fig (much shorter timescale), and from manual canary (where humans approve each step).

<!-- references-section:begin -->
## Composes

**skill — `workflow/canary-release-data-simulation`**  _(version: `*`)_
canary-shape-baseline

**skill — `backend/conditional-feature-flag-rollout`**  _(version: `*`)_
traffic-control-implementation

**knowledge — `pitfall/canary-release-implementation-pitfall`**  _(version: `*`)_
counter-evidence

<!-- references-section:end -->

## When to use

- Service has stable KPIs (error rate, p99 latency) that fail loudly when broken
- Continuous deployment infra can shift traffic ratio programmatically
- Regression rollback within minutes is acceptable (most modern web services)

## When NOT to use

- KPIs are slow-emerging (a memory leak takes hours; canary may finish before signal)
- Service has no traffic split capability (load balancer / mesh required)
- Compliance requires human approval at every step (use manual canary)

## Phase sequence

```
[deploy v2 to canary nodes]
        │
        ▼
[1% traffic to v2] ──► KPI gate ──FAIL─► [auto-revert: 100% to v1] + alert
        │ PASS
        ▼
[5% traffic]      ──► KPI gate ──FAIL─► [auto-revert: 100% to v1]
        │ PASS
        ▼
... (25% / 50% / 100%) ...
        │
        ▼
[v1 decommission]
```

## Glue summary (net value added)

| Added element | Where |
|---|---|
| Auto-revert is automatic, not "page someone" — humans confirm post-incident | KPI gate |
| KPI window is bounded (e.g. 10 minutes per step) — neither too short (false negative) nor too long (delays) | Per step |
| Revert revokes the entire ratio, not just the current step | Failure handling |
| KPI thresholds defined once before rollout; mid-rollout adjustment is forbidden | Pre-deploy |

## Known limitations

- Auto-revert can flap if KPI is noisy — needs hysteresis or longer window
- Slow-emerging issues (memory leaks, cache poisoning) may slip through
- Decommissioning v1 too eagerly removes the rollback target

## Provenance

- Authored 2026-04-25, pilot in 10-technique batch
- Shares "ratio shift over time" with #2 (strangler-fig) but compressed timescale
