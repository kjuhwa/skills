---
name: bloom-filter-data-simulation
description: Workflow for generating synthetic bloom filter datasets that demonstrate insertion, probe, and false-positive-rate dynamics.
category: workflow
triggers:
  - bloom filter data simulation
tags:
  - auto-loop
version: 1.0.0
---

# bloom-filter-data-simulation

A bloom filter simulation runs in stepped epochs to make saturation visible over time. The false-positive lab demonstrates the canonical pattern: configure `m` (bit count: 32–256), `k` (hash functions: 2–5), then loop N steps (e.g., 50). At each step, insert one synthetic word (`"word_" + i`), then probe with a batch of P unique strings that were *never* inserted (`"probe_" + j` where j > N). Count how many probes return "probably yes" and record `actualFP = matches / P`. Simultaneously compute the theoretical rate `(1 − e^(−k·n/m))^k`. Collecting both series lets you chart empirical vs. theoretical divergence — the key learning outcome.

For scenario-driven simulations (like the spam demo), pre-seed the filter with a labeled dictionary (e.g., 10 spam keywords: "viagra", "lottery", "casino"…) and prepare a mixed stream of labeled items (10 spam + 10 safe, shuffled). Process them one at a time with a user-triggered or timed delay (600 ms works well for demos). Classify each item as "blocked" when `check()` returns true, "passed" otherwise. Because the safe items were never inserted, any safe item that gets blocked is a visible false positive — this makes the abstract concept concrete for non-technical audiences.

The critical simulation parameters to expose are: **filter size (m)**, **hash count (k)**, and **insertion count (n)**. Keeping m small (32–128) for demos deliberately inflates false positives so they occur within a short run. For repeatable results, use deterministic hash seeds (e.g., seed values 0, 1, 2…k−1 fed into `(seed × 31 + charCode) % m`) rather than random salts. This seed-based hashing is simple, portable across languages, and produces visually distinct bit patterns per hash function — important when highlighting which positions each function selects.
