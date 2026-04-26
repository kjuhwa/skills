---
version: 0.2.0-draft
name: leader-election-orchestrator-failover
description: "Multiple orchestrator instances with leader election; only leader dispatches; failover on leader-loss preserves in-flight task state."
category: ai
tags:
  - orchestrator
  - leader-election
  - failover
  - high-availability
  - state-handoff

composes:
  - kind: knowledge
    ref: architecture/opensre-investigation-pipeline-architecture
    version: "*"
    role: pipeline-state-shape
  - kind: knowledge
    ref: pitfall/circuit-breaker-implementation-pitfall
    version: "*"
    role: failure-detection-discipline
  - kind: knowledge
    ref: pitfall/ai-guess-mark-and-review-checklist
    version: "*"
    role: ai-state-guard

recipe:
  one_line: "N orchestrator instances elect one leader (lease-based or quorum). Leader dispatches; followers shadow state. On leader heartbeat loss, election re-runs; new leader resumes from last checkpointed state."
  preconditions:
    - "Distributed lease store available (etcd, Consul, ZooKeeper) or quorum protocol"
    - "Orchestrator state can be checkpointed durably (not in-memory only)"
    - "Workers can re-attach to a new leader without abandoning in-flight tasks"
  anti_conditions:
    - "Single-instance acceptable — election overhead is wasted"
    - "Hard real-time SLA where election latency exceeds tolerance"
    - "Workers cannot re-attach to new leader (e.g. stateful socket per leader)"
  failure_modes:
    - signal: "Split-brain: two instances both believe they are leader; double dispatch"
      atom_ref: "knowledge:architecture/opensre-investigation-pipeline-architecture"
      remediation: "Lease must be fenced (monotonic token); workers reject commands from old fenced lease"
    - signal: "Leader heartbeat false-positive; healthy leader replaced; in-flight work aborted"
      atom_ref: "knowledge:pitfall/circuit-breaker-implementation-pitfall"
      remediation: "Heartbeat threshold tuned to network jitter; phi-accrual detector preferred over binary timeout"
    - signal: "New leader uses stale checkpoint; replays decisions already executed"
      atom_ref: "knowledge:pitfall/ai-guess-mark-and-review-checklist"
      remediation: "Checkpoint includes last-decision sequence; new leader skips decisions ≤ checkpoint seq"
  assembly_order:
    - phase: leader-election
      uses: pipeline-state-shape
    - phase: leader-dispatch
      uses: pipeline-state-shape
    - phase: heartbeat-monitor
      uses: failure-detection-discipline
      branches:
        - condition: "heartbeat lost past threshold"
          next: re-election
        - condition: "heartbeat healthy"
          next: continue
    - phase: re-election
      uses: pipeline-state-shape
    - phase: resume-from-checkpoint
      uses: ai-state-guard

binding: loose

verify:
  - "every composes[].ref resolves on disk"
  - "the technique requires fenced lease (monotonic token), not just lease+TTL"
---

# Leader-Election Orchestrator Failover

> N orchestrator instances elect one leader. Leader dispatches; followers shadow state. On leader-loss, election re-runs; new leader resumes from last checkpoint. Fenced lease prevents split-brain double-dispatch.

## When to use
- Distributed lease store available
- Orchestrator state durably checkpointable
- Workers can re-attach to new leader

## When NOT to use
- Single-instance acceptable
- Hard real-time SLA
- Workers stateful per leader

## Glue summary
| Added element | Where |
|---|---|
| Fenced lease (monotonic token, prevents split-brain) | Election |
| Phi-accrual heartbeat (vs binary timeout) | Failure detection |
| Checkpoint-seq replay-skip | Recovery |

## Provenance
- Authored 2026-04-26 in batch with 9 sibling orchestrator techniques
