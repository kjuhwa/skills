---
version: 0.1.0-draft
name: multi-peer-quorum-decision-loop
description: "Multi-peer quorum: flat peers, term-bound leader rotation, phi-accrual failure detection, off-by-one-safe quorum math"
category: arch
tags:
  - consensus
  - quorum
  - raft
  - leader-election
  - failure-detection
  - flat-peer

composes:
  - kind: skill
    ref: workflow/raft-consensus-data-simulation
    version: "*"
    role: consensus-baseline
  - kind: skill
    ref: algorithms/gossip-round-rng-seeded-reproducible-sim
    version: "*"
    role: gossip-alternative-shape
  - kind: skill
    ref: backend/service-discovery-replica-leader-tracking
    version: "*"
    role: leader-tracking-implementation
  - kind: knowledge
    ref: pitfall/raft-consensus-implementation-pitfall
    version: "*"
    role: consensus-counter-evidence
  - kind: knowledge
    ref: decision/phi-accrual-failure-detector-over-binary-timeout
    version: "*"
    role: failure-detection-rationale
  - kind: knowledge
    ref: pitfall/quorum-visualization-off-by-one
    version: "*"
    role: quorum-math-counter-evidence

recipe:
  one_line: "N flat peers, term-bound leader rotation, phi-accrual failure detection, quorum off-by-one safe math. No permanent leader, no permanent follower."
  preconditions:
    - "≥3 peers needed for any meaningful quorum (N=2 is degenerate; N=3 is minimum useful)"
    - "Network partitions are expected and must not corrupt state"
    - "Decision throughput acceptable at consensus latency (round-trip × N peers per decision)"
  anti_conditions:
    - "Single-leader system acceptable — use Raft directly without rotation overhead"
    - "Strong consistency not required — gossip/eventual consistency is cheaper"
    - "N=1 or N=2 — no quorum possible; pick a different pattern"
  failure_modes:
    - signal: "Leader election flap during partition; multiple peers each elect themselves"
      atom_ref: "knowledge:pitfall/raft-consensus-implementation-pitfall"
      remediation: "Term-bound election with random election timeout; majority-vote rule prevents two leaders in same term"
    - signal: "Binary timeout misclassifies slow peer as failed; quorum drops below threshold under transient slowness"
      atom_ref: "knowledge:decision/phi-accrual-failure-detector-over-binary-timeout"
      remediation: "Use phi-accrual detector (continuous suspicion score) instead of binary up/down; tune phi threshold per workload"
    - signal: "Quorum calculation off-by-one — N=4 requires 3 votes (not 2); silent corruption when 2 voters disagree"
      atom_ref: "knowledge:pitfall/quorum-visualization-off-by-one"
      remediation: "Quorum formula = floor(N/2)+1; visualize with explicit N=4→3 case in test fixtures"
  assembly_order:
    - phase: peer-init
      uses: consensus-baseline
    - phase: leader-election
      uses: leader-tracking-implementation
    - phase: propose
      uses: consensus-baseline
    - phase: vote-collect
      uses: consensus-baseline
      branches:
        - condition: "≥quorum votes received"
          next: commit
        - condition: "below quorum or timeout"
          next: re-propose-or-step-down
    - phase: commit
      uses: consensus-baseline
    - phase: re-propose-or-step-down
      uses: leader-tracking-implementation

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "every composes[].version range intersects the installed version"
  - "the technique enforces flat peer structure — no permanent leader, no permanent follower"
  - cmd: "./verify.sh"
---

# Multi-Peer Quorum Decision Loop

> Pilots #1–#6 each had a fixed structural asymmetry: orchestrator → workers (linear), one decision point with branches (tree), one processor with cycles (loop), root → tiers (ladder), single forward+reverse chain (saga), one producer + one consumer + feedback (backpressure). This pilot is **flat multi-peer voting** — N peers with no permanent hierarchy, decisions reached via quorum agreement, leadership (when needed) rotates among them. There is no orchestrator and no follower role; each peer is a full participant in every decision.

<!-- references-section:begin -->
## Composes

**skill — `workflow/raft-consensus-data-simulation`**  _(version: `*`)_
consensus-baseline

**skill — `algorithms/gossip-round-rng-seeded-reproducible-sim`**  _(version: `*`)_
gossip-alternative-shape

**skill — `backend/service-discovery-replica-leader-tracking`**  _(version: `*`)_
leader-tracking-implementation

**knowledge — `pitfall/raft-consensus-implementation-pitfall`**  _(version: `*`)_
consensus-counter-evidence

**knowledge — `decision/phi-accrual-failure-detector-over-binary-timeout`**  _(version: `*`)_
failure-detection-rationale

**knowledge — `pitfall/quorum-visualization-off-by-one`**  _(version: `*`)_
quorum-math-counter-evidence

<!-- references-section:end -->

## When to use

- A small cluster (3–9 peers typical) needs to agree on shared state
- The system must remain available when up to ⌊N/2⌋ peers are unreachable
- Strong consistency required — eventual consistency models (e.g. CRDTs) are not acceptable
- Network partitions are possible — split-brain prevention is a hard requirement
- Each peer is reachable from every other peer (full mesh, not star)

## When NOT to use

- Single-region / low-latency deployment where leader-follower replication is sufficient — a flat quorum is overkill
- Very large clusters (≥ 10 peers) — quorum messaging cost becomes superlinear; sharded consensus with sub-quorums is a different technique
- Ad-hoc / dynamic membership without a stable ID set — quorum math depends on knowing N
- Tasks that don't need strong consistency — gossip-based eventual consistency is cheaper

## Decision cycle (one quorum proposal)

```
   ┌──────────────────────────────────────────────────────────────┐
   │   peer A         peer B         peer C         peer D    ... │
   │   (proposer)                                                 │
   │                                                              │
   │      │                                                       │
   │      │ propose(value, term)                                  │
   │      ├──►──────►──────►──────►──────►── (full mesh)          │
   │      │                                                       │
   │      ◄──── ack? / nak? from each peer ──────────────         │
   │                                                              │
   │   tally votes:  if ack_count ≥ ⌊N/2⌋+1  →  COMMIT             │
   │                  else                    →  RETRY or ABANDON  │
   │                                                              │
   │   COMMIT broadcast on a separate term                         │
   │      │                                                       │
   │      ▼                                                       │
   │   each peer applies the value and persists the term          │
   │                                                              │
   └──────────────────────────────────────────────────────────────┘

   Quorum math (CRITICAL — see pitfall/quorum-visualization-off-by-one):
     N = 3: quorum = 2  (NOT 1, NOT 3)
     N = 4: quorum = 3  (4/2+1 = 3, the larger half)
     N = 5: quorum = 3  (tolerates 2 failures)
     N = 7: quorum = 4  (tolerates 3 failures)

   ⌊N/2⌋+1 is the formula. Off-by-one (using N/2 or N/2+1 with int rounding
   the wrong way) causes split-brain — see the knowledge entry for examples.
```

## Glue summary (net value added by this technique)

The composed atoms each describe a piece. What this technique uniquely adds:

| Added element | Where |
|---|---|
| Quorum math is **⌊N/2⌋+1**, NOT N/2; the difference is a split-brain bug | Vote tally |
| Failure detection MUST use phi-accrual or equivalent **graded confidence**, never binary timeout (per `decision/phi-accrual-failure-detector-over-binary-timeout`) | Per-peer health |
| Leadership is **transient and term-bound** — a leader expires at term boundary even if responsive; no peer accumulates permanent authority | Leader rotation |
| Membership is **snapshot-bound per term** — adding/removing a peer mid-term is forbidden; changes apply at next term boundary | Membership control |
| Split-brain prevention: when peer count is exactly even (N=4, N=6), use a fixed **tiebreaker rule** (lowest-ID wins or seed-randomized) — never accept "no quorum reached" as commit | Edge case |
| Idempotency at proposal level: same `(term, proposal-id)` is at-most-once-applied even if multiple peers re-broadcast | Apply phase |
| Bootstrap protocol: cold start with no prior term requires explicit "founding quorum" message before any normal decision | Init |

The atomic skills tell you **how raft commits a log entry**, **how gossip propagates state**, or **how a service registry tracks leaders**. This technique tells you **the rules every multi-peer agreement must follow regardless of which atom is the underlying engine** — quorum math, failure detection grade, term boundaries, membership snapshots, tiebreakers.

## Why phi-accrual over binary timeout (failure detection)

Binary timeout: peer is alive (heartbeat in last T) or dead (no heartbeat in T). The threshold T is a single point of failure — too short → false positives flap leadership; too long → real failures take ages to detect.

Phi-accrual: continuous confidence score that a peer is alive, derived from the heartbeat distribution. Reports "phi = 8" (high confidence dead) or "phi = 1.5" (probably alive but suspicious) instead of a binary verdict. The decision to elect a new leader happens at a configurable phi threshold, but the *signal* is graded and observable. This is the canonical position documented in `knowledge/decision/phi-accrual-failure-detector-over-binary-timeout`.

## Why "leader is transient and term-bound"

A peer that holds leadership for many consecutive terms accumulates implicit authority — its decisions get rubber-stamped, network paths optimize for it, monitoring focuses on it. When it eventually fails, the failure mode is sharper because the cluster has degenerated into "leader plus N followers" rather than "N peers with one of them currently coordinating."

Term-bound rotation forces the cluster to exercise the leader-election path regularly. Failure of any single peer (including the current leader) is just a term boundary, not a special event. The cost is more frequent (cheap) elections in exchange for better tail-latency at actual leader failures.

## Bootstrap protocol

Cold start has a chicken-and-egg problem: quorum math requires a known N, but no term exists yet from which to read membership.

The technique requires an explicit **founding quorum message** signed by ⌊N/2⌋+1 peers' static identities. This message is the term-0 membership snapshot. Once it exists, normal quorum decisions take over. Without this rule, two disjoint subsets of peers can each consider themselves "the cluster" — instant split-brain at startup.

## Verification (draft)

```bash
#!/usr/bin/env bash
set -e
SKILLS_HUB="${SKILLS_HUB:-$HOME/.claude/skills-hub/remote}"
for ref in \
  "skills/workflow/raft-consensus-data-simulation/SKILL.md" \
  "skills/algorithms/gossip-round-rng-seeded-reproducible-sim/SKILL.md" \
  "skills/backend/service-discovery-replica-leader-tracking/SKILL.md" \
  "knowledge/pitfall/raft-consensus-implementation-pitfall.md" \
  "knowledge/decision/phi-accrual-failure-detector-over-binary-timeout.md" \
  "knowledge/pitfall/quorum-visualization-off-by-one.md"; do
  test -f "$SKILLS_HUB/$ref" || { echo "MISSING: $ref"; exit 1; }
done
echo "OK"
```

## Known limitations (v0.1 draft)

- **Strong consistency assumption** — peers must agree before any peer applies. For latency-critical workloads, this serializes commits at the speed of the slowest network round-trip across ⌊N/2⌋+1 peers. CRDTs are out of scope.
- **Static membership assumption** — adding/removing a peer requires a controlled membership-change ceremony (joint consensus per Raft §6) which is itself a sub-technique not detailed here.
- **No Byzantine tolerance** — the technique assumes peers are crash-faulty (silent failure), not actively lying. Byzantine fault tolerance (PBFT, Tendermint) is a different problem with different math (⌊2N/3⌋+1 quorum).
- **Network partition recovery is unspecified** — when a partition heals and two minorities have diverged, the technique requires a reconciliation step but does not prescribe its shape (read-your-writes? compare-and-merge? hard-truncate-minority?). Domain choice.
- **No specific transport prescribed** — the atoms include both raft (RPC-style) and gossip (epidemic-style) shapes. The technique describes the rules that apply to either.

## Provenance

- Authored: 2026-04-25
- Status: pilot #7 for the `technique/` schema v0.1 — **flat multi-peer voting** shape (complementary to all 6 prior pilots which had a fixed structural asymmetry)
- Schema doc: `docs/rfc/technique-schema-draft.md`
- Sibling pilots:
  - `technique/workflow/safe-bulk-pr-publishing` (linear)
  - `technique/debug/root-cause-to-tdd-plan` (decision tree)
  - `technique/testing/fuzz-crash-to-fix-loop` (event-driven loop)
  - `technique/ai/agent-fallback-ladder` (hierarchical ladder)
  - `technique/arch/saga-with-compensation-chain` (forward + reverse chain)
  - `technique/data/producer-consumer-backpressure-loop` (continuous bidirectional flow)
