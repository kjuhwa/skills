---
version: 0.1.0-draft
name: multi-agent-fan-out-with-isolation
description: "Multi-agent fan-out with bulkhead isolation: parallel sub-agents on disjoint scopes, no shared state mid-task"
category: ai
tags:
  - multi-agent
  - fan-out
  - bulkhead
  - scope-isolation
  - subagent

composes:
  - kind: skill
    ref: agents/basic-agent-runner
    version: "*"
    role: agent-runtime-baseline
  - kind: skill
    ref: ai/ai-subagent-scope-narrowing
    version: "*"
    role: scope-discipline
  - kind: skill
    ref: workflow/bulkhead-data-simulation
    version: "*"
    role: isolation-shape

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "sub-agents have disjoint scopes; cross-agent communication is forbidden mid-task"
---

# Multi-Agent Fan-Out with Bulkhead Isolation

> A coordinator dispatches N parallel sub-agents, each with a disjoint scope. Sub-agents do not communicate with each other mid-task; results fan-in only at the coordinator. Bulkhead isolation prevents one sub-agent's failure from contaminating peers. Distinct from a single agent with parallel tool calls (no scope partitioning) and from agent-as-tool patterns (sequential, not parallel).

## When to use

- Task naturally decomposes into independent sub-tasks (parallel scans, parallel transforms)
- Sub-agents share no state — communication mid-task is unnecessary AND forbidden
- Coordinator can synthesize sub-agent results at fan-in

## When NOT to use

- Sub-agents need to consult each other mid-task (use a different orchestration pattern)
- Task is sequential by nature (single agent suffices)
- Coordinator has no way to verify sub-agent correctness independently — invites silent confabulation

## Shape

```
coordinator
    │
    ├──► sub-agent A (scope a, isolated context) ──┐
    ├──► sub-agent B (scope b, isolated context) ──┼─► fan-in at coordinator
    ├──► sub-agent C (scope c, isolated context) ──┤
    └──► sub-agent D (scope d, isolated context) ──┘
                                                    │
                                                    ▼
                                          coordinator synthesizes
```

## Glue summary (net value added)

| Added element | Where |
|---|---|
| Each sub-agent's prompt explicitly forbids reading or assuming peer state | Sub-agent prompt |
| Coordinator pre-computes scope partitioning before dispatch — sub-agents do NOT negotiate scope | Pre-dispatch |
| Sub-agent failure isolated; surviving sub-agents continue and return partial results | Bulkhead enforcement |
| Coordinator's synthesis can detect partial failures from missing scopes | Fan-in |

## Known limitations

- Scope partitioning is the technique's hardest design choice — bad partitioning wastes parallelism
- Coordinator overhead grows with N; benefit caps when coordination cost ≥ parallelism savings
- Cannot handle tasks where dependencies emerge mid-execution

## Provenance

- Authored 2026-04-25, pilot in 10-technique batch
- Related to paper #2 (parallel-dispatch-breakeven-point) for cost considerations
