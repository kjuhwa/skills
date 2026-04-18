---

name: bulkhead-data-simulation
description: Generating realistic traffic patterns that exercise bulkhead isolation and failure containment
category: workflow
triggers:
  - bulkhead data simulation
tags: [workflow, bulkhead, data, simulation]
version: 1.0.0
---

# bulkhead-data-simulation

Simulate bulkhead behavior with at least three concurrent workload generators targeting different partitions, where one generator is deliberately pathological (slow-responding or erroring) while others run healthy traffic. The educational value comes from showing that the pathological partition saturates and rejects while neighbors keep flowing — so your simulation loop must tick all partitions on the same clock and render each tick's state. A single-partition simulator cannot demonstrate the pattern; you need at least 2-3 pools to show isolation.

Model each request as an object with `arrivalTime`, `serviceTime`, `partitionKey`, and `state` (queued|running|completed|rejected). Service time should be drawn from a distribution (exponential or lognormal) rather than constant, because constant service times hide the queueing dynamics that make bulkheads interesting. Include a "noisy neighbor" injection knob — a slider or scheduled event that spikes one partition's service time to 10-50x baseline — so users can trigger saturation on demand and see rejections appear on only that partition.

Drive the clock with `requestAnimationFrame` or a fixed-interval tick (50-100ms), advancing all partitions in lockstep. Accumulate per-partition counters for accepted/rejected/completed and expose them to the visualization layer. Seed the RNG so demo runs are reproducible; expose a seed input so users can share interesting failure scenarios. Reset button should clear all partition queues, counters, and history in one action.
