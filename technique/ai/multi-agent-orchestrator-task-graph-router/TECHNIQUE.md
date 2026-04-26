---
version: 0.2.0-draft
name: multi-agent-orchestrator-task-graph-router
description: "Orchestrator parses a task DAG, routes each node to the cheapest capable agent, joins results at fan-in barriers."
category: ai
tags:
  - orchestrator
  - multi-agent
  - task-graph
  - dag-routing
  - fan-in

composes:
  - kind: skill
    ref: ai/ai-subagent-scope-narrowing
    version: "*"
    role: scope-narrowing-per-node
  - kind: skill
    ref: workflow/bucket-parallel-java-annotation-dispatch
    version: "*"
    role: parallel-dispatch-mechanics
  - kind: knowledge
    ref: pitfall/ai-guess-mark-and-review-checklist
    version: "*"
    role: ai-output-guard

recipe:
  one_line: "Parse task as DAG; per node: assign cheapest capable agent + isolated scope; topological-sort dispatch; fan-in barrier per dependency edge; output graph after all leaves complete."
  preconditions:
    - "Task naturally decomposes into 3+ nodes with explicit dependency edges"
    - "Multiple agents available with different cost/capability profiles"
    - "Fan-in synchronization is acceptable (not strict streaming)"
  anti_conditions:
    - "Linear single-step task — DAG overhead unjustified"
    - "All agents have same cost+capability — routing has no signal"
    - "Real-time streaming output required — batch fan-in introduces unacceptable latency"
  failure_modes:
    - signal: "Cycle in task graph; orchestrator deadlocks or repeats"
      atom_ref: "skill:workflow/bucket-parallel-java-annotation-dispatch"
      remediation: "Validate DAG (topological sort exists) before dispatch; reject cyclic submissions"
    - signal: "Agent invents intermediate state not in original DAG"
      atom_ref: "knowledge:pitfall/ai-guess-mark-and-review-checklist"
      remediation: "Mark every agent-produced state; orchestrator validates against expected outputs schema"
    - signal: "Cheapest-routing assigns task beyond agent capability; node fails"
      atom_ref: "skill:ai/ai-subagent-scope-narrowing"
      remediation: "Capability check before assignment; fall back to next-tier agent on capability miss"
  assembly_order:
    - phase: parse-dag
      uses: parallel-dispatch-mechanics
    - phase: route-nodes
      uses: scope-narrowing-per-node
    - phase: dispatch-parallel
      uses: parallel-dispatch-mechanics
    - phase: ai-guard
      uses: ai-output-guard
    - phase: fan-in-join
      uses: parallel-dispatch-mechanics

binding: loose

verify:
  - "every composes[].ref resolves on disk"
  - "the technique requires DAG validation before dispatch, not at runtime"
---

# Multi-Agent Orchestrator: Task-Graph Router

> Parses task as DAG, routes each node to cheapest capable agent, fan-in joins at dependency edges. Differs from flat fan-out (which has no inter-task dependencies) by handling explicit graph structure.

## When to use
- Task decomposes into 3+ nodes with edges
- Multiple agents with varied cost/capability
- Fan-in synchronization acceptable

## When NOT to use
- Linear single-step task
- Uniform agent fleet
- Real-time streaming required

## Glue summary
| Added element | Where |
|---|---|
| DAG validation (cycle detection) before dispatch | Pre-dispatch |
| Capability check before cheapest-routing | Routing |
| AI-state guard against invented intermediate state | AI guard |

## Provenance
- Authored 2026-04-26 in batch with 9 sibling orchestrator techniques
