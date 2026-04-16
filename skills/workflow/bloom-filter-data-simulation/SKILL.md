---
name: bloom-filter-data-simulation
description: Benchmark false-positive rates across multiple bloom filter configurations using randomized insert/lookup cycles.
category: workflow
triggers:
  - bloom filter data simulation
tags:
  - auto-loop
version: 1.0.0
---

# bloom-filter-data-simulation

The simulation workflow compares multiple bloom filter configurations (varying `size` and `hashCount`) against the same workload to surface how parameter choices affect false-positive rates. The core loop is: (1) generate `nItems` random strings and insert them into each filter configuration, (2) generate `nLookups` random strings that are **not** in the inserted set (use a different string length, e.g. length-7 vs length-6, to guarantee non-membership without costly set lookups), (3) for each lookup, check all k hash positions — if all are set, count it as a false positive. The false-positive rate is `falsePositives / nLookups`.

The key reusable hash function pattern across all three apps is a seed-based DJB2 variant: `h = ((h << 5) - h + charCode) | 0`, producing k independent hashes by varying the seed as `seed = i * 31 + 7` for hash index i. This avoids needing k truly independent hash functions — the seed offset provides sufficient independence for educational and lightweight production use. The bit array is always a `Uint8Array(size)` with index computed as `((h % size) + size) % size` to handle negative modulo results from the bitwise-OR truncation.

For benchmarking, use slider-driven parameters (items: 10–500, lookups: 100–2000) and render results as a bar chart with one bar per configuration. The configurations should span a meaningful range — e.g. `{size:64, hashes:2}` vs `{size:256, hashes:5}` — so users see that doubling bit-array size matters more than adding hash functions once the filter is near saturation. Normalize bar heights to the maximum observed rate so small differences remain visible.
