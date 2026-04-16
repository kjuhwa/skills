---
name: consistent-hashing-data-simulation
description: Parameterized simulation of key distribution across physical and virtual nodes with statistical balance metrics.
category: workflow
triggers:
  - consistent hashing data simulation
tags:
  - auto-loop
version: 1.0.0
---

# consistent-hashing-data-simulation

Build the simulation by constructing a ring of `nNodes × nVnodes` entries, where each virtual node is hashed from a composite string like `node${i}-vn${v}`. Sort the ring by hash value, then for each of `nKeys` synthetic keys perform the standard clockwise lookup to find the owning physical node. Accumulate counts per physical node in a flat array. This two-loop structure (build ring, then assign keys) cleanly separates topology from workload and allows either axis to be swept independently via range sliders.

Expose three control parameters — physical node count (2–10), virtual nodes per physical node (1–200), and total key count (50–2000) — as interactive sliders that re-run the simulation on every `oninput` event. The critical teaching moment is the virtual-node multiplier: at `vnodes=1` the coefficient of variation (CoV) is typically 40–80%, but at `vnodes≥100` it drops below 10%, demonstrating the standard industry practice of using 100–200 virtual nodes per physical node. Render results as a bar chart with an "ideal" dashed line at `nKeys/nNodes` so deviation is immediately apparent.

Compute and display four metrics after each run: standard deviation, CoV percentage, min count, and max count. CoV (`σ/μ × 100`) is the single most informative balance metric because it is scale-independent — it stays meaningful whether you have 100 or 100,000 keys. The simulation intentionally uses a simple multiplicative hash (`Math.imul(31, h) + charCode`) rather than a cryptographic one, which is realistic for in-memory routing but will show more variance at low virtual-node counts, reinforcing the lesson that hash quality and virtual-node count are the two primary tuning levers.
