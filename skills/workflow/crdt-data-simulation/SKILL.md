---

name: crdt-data-simulation
description: Simulating network partitions, concurrent edits, and message reordering to exercise CRDT merge logic
category: workflow
triggers:
  - crdt data simulation
tags: [workflow, crdt, data, simulation]
version: 1.0.0
---

# crdt-data-simulation

CRDT demos need a simulation harness that generates realistic concurrent-edit scenarios: spawn N virtual replicas, apply randomized local operations (increments, text edits, add/remove element) at each, and introduce controllable network conditions — partition two replicas for K ticks, deliver messages out-of-order, duplicate deliveries, and reconnect. The harness must record every operation with (replicaId, lamportClock, payload) so the demo can replay exact sequences for debugging non-converging cases.

Seed the simulation with three canonical scenarios: (1) "happy path" concurrent non-conflicting ops to show baseline convergence, (2) "conflict storm" where all replicas edit the same key/element simultaneously to exercise tie-breaking (LWW timestamp, OR-Set tag uniqueness, G-Counter per-replica slots), and (3) "partition-heal" where replicas diverge for a period then reconnect — the dramatic moment that sells CRDTs. Expose tick-rate and op-frequency sliders so viewers can slow down the interesting moments.

Always compute and display a state-hash per replica after each merge step; divergence at any point is a bug in the merge function, not a visualization artifact. Persist the last 100 operations in a ring buffer for the event log, and make the simulation deterministic via a seedable PRNG so bug reports are reproducible.
