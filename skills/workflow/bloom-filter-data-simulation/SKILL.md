---
name: bloom-filter-data-simulation
description: Strategies for generating realistic Bloom filter insertion streams, membership queries, and false-positive measurement workloads in browser-based simulations.
category: workflow
triggers:
  - bloom filter data simulation
tags:
  - auto-loop
version: 1.0.0
---

# bloom-filter-data-simulation

Seed the simulation with a **two-pool element strategy**: a "member pool" of elements that will be inserted into the filter, and a "probe pool" of elements guaranteed to never be inserted. Use deterministic pseudo-random generators (e.g., a simple xorshift32 seeded from a UI input) so runs are reproducible. For the member pool, generate strings like `item-0001` through `item-N`; for the probe pool, use a disjoint prefix like `probe-0001`. Insert from the member pool at a configurable rate (e.g., 1-50 per second via `setTimeout` ticks), and after each batch, probe 100 elements from the probe pool to measure the empirical false-positive rate. This hot-loop of insert-then-probe is the backbone of every bloom-filter playground.

Hash functions in browser simulations must be **fast and independent enough** to approximate uniform distribution without importing libraries. The standard trick is a single FNV-1a or djb2 base hash, then derive k variants via double-hashing: `h_i(x) = (h1(x) + i * h2(x)) % m`. Implement h1 and h2 as two runs of the same hash with different seeds (e.g., prepend a salt byte). This avoids the mistake of using `Math.random()` (which decouples the hash from the element value) or a single hash mod-shifted (which introduces correlation between bit positions). Expose the raw hash values in a "debug" panel so users can verify the distribution.

For the comparison app, simulate **multiple filter configurations in lockstep** — same insertion stream, different `(m, k)` parameters. Track per-filter metrics in parallel arrays and emit a unified tick event that the visualization layer consumes. To demonstrate the space-accuracy tradeoff, include at least one configuration with an undersized `m` that visibly degrades, and one with an oversized `m` that wastes bits but stays accurate. Optionally model a **counting Bloom filter** variant (4-bit counters per slot) to show how deletions become possible at the cost of 4x memory, and a **cuckoo filter** alternative for side-by-side performance comparison.
