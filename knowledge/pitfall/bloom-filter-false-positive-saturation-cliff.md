---
name: bloom-filter-false-positive-saturation-cliff
description: Bloom filters silently degrade to ~100% false-positive rate once load exceeds design capacity, breaking set-diff reconciliation.
category: pitfall
tags:
  - rolling
  - auto-loop
---

# bloom-filter-false-positive-saturation-cliff

A Bloom filter sized for `n` items at target FPR `p` uses `m = -n·ln(p)/(ln2)²` bits and `k = (m/n)·ln2` hashes. The FPR formula `(1 - e^(-kn/m))^k` is only valid up to the design `n` — push 2× more items in and the FPR doesn't "degrade gracefully", it collapses toward 1.0. In a gossip/anti-entropy context this means the receiver thinks every item is already present and reconciliation silently stops transferring real deltas. There is no runtime error; the symptom is "replicas look converged but aren't."

Mitigations that actually work: (1) track insert count and rotate to a fresh, larger filter at ~70% of design capacity; (2) use a scalable/layered Bloom (sequence of filters with geometrically tightening FPRs, query all, insert into newest unsaturated); (3) for unbounded streams, prefer a counting Bloom or cuckoo filter so you can evict. Do NOT just "add more hash functions" — once `m/n` is too small, more `k` makes it worse.

Always assert `approximate_fill_ratio < 0.5` before trusting a Bloom-based diff result. Fill ratio = `popcount(bits)/m`; above 0.5 the math says you're past the sweet spot. Log this on every gossip round; it's the single most useful health metric for a Bloom-based reconciler.
