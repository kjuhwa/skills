---
version: 0.2.0-draft
name: quorum-scaling-curve
description: "Quorum performance vs N peers: hypothesis sweet spot is N=3-5; degrades past N=7 due to superlinear coord cost"
category: arch
tags: [quorum, consensus, scaling, hypothesis, performance-curve]
type: hypothesis

premise:
  if: The peer count N in a quorum-based consensus cluster grows
  then: Coordination cost grows superlinearly because every commit requires ⌊N/2⌋+1 acks. Performance (commit throughput, p99 latency) peaks at N=3-5 and degrades sharply past N=7. Production sweet spot is N=5; N=7 only when fault tolerance demands ≥3 simultaneous failures tolerated.

examines:
  - kind: skill
    ref: workflow/raft-consensus-data-simulation
    role: consensus-shape-baseline
  - kind: skill
    ref: algorithms/gossip-round-rng-seeded-reproducible-sim
    role: alternative-shape-for-comparison
  - kind: knowledge
    ref: pitfall/raft-consensus-implementation-pitfall
    role: counter-evidence
  - kind: knowledge
    ref: decision/phi-accrual-failure-detector-over-binary-timeout
    role: failure-detection-context

perspectives:
  - name: Quorum Math Mechanics
    summary: ⌊N/2⌋+1 acks means N=3 → 2 acks, N=5 → 3, N=7 → 4. Each ack is a network round-trip. Tail latency grows with the slowest of ⌊N/2⌋+1 peers.
  - name: Tolerance vs Performance
    summary: N=3 tolerates 1 failure; N=5 tolerates 2; N=7 tolerates 3. Each step adds tolerance but compounds the round-trip count. Most workloads need ≤2 simultaneous failures tolerated.
  - name: Network Topology Effect
    summary: Cross-region peers add round-trip latency that dominates. The same N has very different curves in single-AZ vs multi-region deployments.
  - name: Beyond N=9
    summary: At N≥9 the consensus protocol itself often becomes the bottleneck; alternatives like sharded consensus (Spanner) or hierarchical paxos become more practical.

external_refs: []

proposed_builds:
  - slug: quorum-throughput-benchmark
    summary: Multi-N benchmark: spin up N ∈ {3, 5, 7, 9, 11} peer simulators; measure commit throughput and p99 latency at each N. Compare to ⌊N/2⌋+1 round-trip prediction.
    scope: poc
    requires:
      - kind: skill
        ref: workflow/raft-consensus-data-simulation
        role: harness-implementation
      - kind: knowledge
        ref: pitfall/raft-consensus-implementation-pitfall
        role: avoid-known-bugs-in-harness

experiments:
  - name: quorum-throughput-vs-N
    hypothesis: Throughput peaks at N=5; at N=7 throughput drops by ≥30% vs N=5; at N=9 by ≥60%. Tolerance gain per step does not compensate.
    method: Run benchmark at fixed workload across N values; plot throughput curve.
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Quorum Scaling Curve: Where is the Sweet Spot?

## Premise

(see frontmatter)

## Background

The hub's `technique/arch/multi-peer-quorum-decision-loop` describes the shape but not the optimal N. Engineering folklore says "3 or 5"; this paper attempts to ground that with a measurable curve.

## Perspectives

(see frontmatter)

## External Context

Etcd, Consul, ZooKeeper deployment guides recommend N=3 or N=5; this paper would compare those recommendations against a benchmark.

## Limitations

- "Sweet spot" is workload-dependent; this paper assumes a generic mixed read/write workload
- Network topology (single AZ, multi-AZ, multi-region) drastically shifts the curve; the paper's N=5 sweet-spot claim assumes single-AZ
- Failure tolerance requirements may force higher N regardless of performance

## Provenance

- Authored 2026-04-25, batch of 10
