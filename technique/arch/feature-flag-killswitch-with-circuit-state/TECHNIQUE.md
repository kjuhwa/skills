---
version: 0.1.0-draft
name: feature-flag-killswitch-with-circuit-state
description: "Feature-flag killswitch with circuit state: per-flag breaker, error-rate threshold trips it, manual half-open re-arm"
category: arch
tags:
  - feature-flag
  - killswitch
  - circuit-breaker
  - error-rate-threshold
  - manual-rearm

composes:
  - kind: skill
    ref: backend/conditional-feature-flag-rollout
    version: "*"
    role: feature-flag-shape
  - kind: skill
    ref: workflow/circuit-breaker-data-simulation
    version: "*"
    role: circuit-state-shape
  - kind: knowledge
    ref: pitfall/circuit-breaker-implementation-pitfall
    version: "*"
    role: counter-evidence

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "the half-open re-arm is manual, not automatic, to prevent flapping"
---

# Feature-Flag Killswitch with Circuit State

> Each feature flag is wrapped by a per-flag circuit breaker. If the feature's error rate crosses a threshold, the breaker trips and the flag is force-disabled until an operator manually re-arms it. Distinct from automatic circuit breakers (which retry probes) and from plain feature flags (which require manual disable on bad data).

## When to use

- New features deployed via flags need a fast-disable path independent of code-deploy cycle
- Error rate is observable per-flag (instrumented at flag check site)
- Manual re-arming is acceptable — protects against auto-flap

## When NOT to use

- Flags toggle infrequently and humans can monitor each
- No per-flag error instrumentation available — generic service breaker suffices
- Auto-recovery is required (manual rearming is too slow)

## Shape

```
[feature flag check]
        │
        ▼
[circuit breaker state for THIS flag]
   │           │           │
   ▼           ▼           ▼
CLOSED      OPEN        HALF-OPEN
(passes)  (force-       (manual rearm
           disable)      pending)
   │
error rate > threshold
   │
   ▼
[trip → OPEN; alert operator]
                 │
            operator investigates
                 │
            operator decides re-arm
                 │
                 ▼
            [transition: OPEN → HALF-OPEN]
                 │
            small sample of traffic
                 │
                 ▼
        success → CLOSED
        failure → OPEN
```

## Glue summary (net value added)

| Added element | Where |
|---|---|
| Per-flag breaker state, not service-wide | State storage |
| Trip threshold defined per flag — different features tolerate different error rates | Flag config |
| Auto-trip is automatic; auto-rearm is FORBIDDEN | Re-arm policy |
| Half-open phase uses sampled traffic, not all-or-nothing | Recovery |
| Trip event emits structured alert with flag name + offending error sample | Observability |

## Known limitations

- Manual rearm can be slow during off-hours — needs on-call coverage
- Per-flag instrumentation cost grows with flag count
- Hysteresis on threshold prevents flap but delays trip — trade-off

## Provenance

- Authored 2026-04-25, pilot in 10-technique batch
- Reuses circuit-breaker shape from #4 (ladder) but on feature-flag axis
