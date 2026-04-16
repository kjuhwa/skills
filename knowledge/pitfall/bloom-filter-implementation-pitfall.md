---
name: bloom-filter-implementation-pitfall
description: Common bloom filter implementation mistakes around hash quality, sizing, and false-positive misinterpretation.
category: pitfall
tags:
  - bloom
  - auto-loop
---

# bloom-filter-implementation-pitfall

The most dangerous pitfall is **hash function correlation**. All three apps use the same structure — `(seed × 31 + charCode) % m` — with only the seed varying between hash functions. When m is small (32 or 64), different seeds can map the same input to the same bit position, effectively reducing k and inflating the false-positive rate beyond theoretical predictions. For example, with m=32 and k=3, two of the three hashes frequently collide on short strings, meaning the filter behaves closer to k=2. The fix for production use is double hashing (`h1(x) + i·h2(x) mod m`) using two independent hash functions (e.g., FNV-1a and murmur3), which guarantees k distinct probes when m is prime or sufficiently large. The simple seed-multiplication approach is fine for educational demos but should never be carried into production code.

The second pitfall is **undersizing the filter for the expected cardinality**. The spam demo uses m=32 bits for 10 keywords — a fill ratio around 50% after insertion, which virtually guarantees false positives on any check. This is intentional for demonstration, but developers copying the pattern often forget to resize. The optimal sizing formula is `m = −(n · ln p) / (ln 2)²` where p is the target false-positive rate. Skipping this calculation and picking a "round number" like 1024 bits leads to either wasted memory (m too large) or unacceptable false-positive rates (m too small). Pair this with the optimal hash count `k = (m/n) · ln 2` — using too many hash functions fills the array faster and *increases* false positives, which is counterintuitive to newcomers who assume "more hashes = more accurate."

A subtler pitfall is **misinterpreting check results in application logic**. The spam demo blocks any email whose subject hashes to all-set positions, but a bloom filter "probably yes" is not proof — it's a *candidate* signal. In production spam filtering, bloom filter positives should feed into a secondary precise check (e.g., exact-match lookup in a database or regex scan), not trigger a terminal action like blocking delivery. Treating "probably in set" as "definitely in set" silently drops legitimate items. Similarly, developers sometimes forget that bloom filters do not support deletion — removing a spam keyword from the seed list without rebuilding the filter leaves its bits set, creating ghost positives that are impossible to diagnose without a full reset.
