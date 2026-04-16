---
name: bloom-filter-implementation-pitfall
description: Common mistakes when implementing Bloom filters in JavaScript — hash correlation, modulo bias, overflow, and misleading false-positive reporting.
category: pitfall
tags:
  - bloom
  - auto-loop
---

# bloom-filter-implementation-pitfall

The most dangerous pitfall is **hash function correlation**. If you derive k hash positions by simply shifting or truncating a single 32-bit hash (e.g., `hash >> 0 & mask`, `hash >> 8 & mask`, …), the bit positions are not independent — they share entropy, cluster together, and inflate the false-positive rate far beyond the theoretical prediction. The canonical fix is Kirsch-Mitzenmacker double-hashing (`g_i(x) = h1(x) + i·h2(x) mod m`), which is provably equivalent to k independent hashes for Bloom filter purposes. In browser JS, a second pitfall lurks inside the hash itself: JavaScript bitwise operators coerce to **signed 32-bit integers**, so `(hash | 0) % m` can produce negative indices. Always apply `>>> 0` (unsigned right shift by zero) before taking the modulus.

A subtler issue is **modulo bias** when `m` is not a power of two. `hash % m` is slightly biased toward lower indices when `2^32` is not evenly divisible by `m`. For educational apps this is negligible, but it breaks any "empirical vs. theoretical" comparison panel because the theoretical formula assumes uniform distribution. Either constrain `m` to powers of two (which also lets you use `hash & (m-1)` — faster and bias-free) or document the discrepancy.

Finally, **false-positive rate measurement is easy to get wrong**. A common mistake is probing with elements that were previously inserted (testing the member pool instead of the probe pool), which yields 100% "true" results and a reported 0% false-positive rate — making the filter look perfect. Another mistake is measuring too early (after only a few insertions) and reporting an optimistic rate that doesn't reflect steady-state behavior. Always probe with a **guaranteed-disjoint** set, and report the rate as a rolling window over the last N probes rather than a cumulative average, so the visualization accurately reflects how the filter degrades as it fills up.
