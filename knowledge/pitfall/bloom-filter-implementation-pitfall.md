---
version: 0.1.0-draft
name: bloom-filter-implementation-pitfall
description: Hash independence, bit-array indexing, and removal semantics are the common breakage points
category: pitfall
tags:
  - bloom
  - auto-loop
---

# bloom-filter-implementation-pitfall

The most frequent bug is using k hashes that aren't independent — e.g., calling the same `hashCode()` then adding `i` or multiplying by `i+1` produces correlated positions that cluster, inflating the real false-positive rate far above the theoretical `(1-e^(-kn/m))^k`. Use genuinely distinct hash families (FNV-1a + MurmurHash3 + DJB2, or double-hashing `h1 + i*h2 mod m` with two independent seeds). Always mod by m using unsigned arithmetic; in JavaScript, `>>> 0` before `% m` avoids negative indices from 32-bit signed overflow that silently point to bit -3 and get swallowed by array semantics.

A second trap is attempting to "delete" from a standard bloom filter by clearing bits — this corrupts every other element that shared those bits and produces false negatives, which violates the filter's core guarantee. If removal is needed, you must use a counting bloom filter (4-bit counters per slot) instead, and the username-check demo should explicitly disable or hide any delete UI on the standard variant to avoid teaching the wrong model. Similarly, resizing requires re-inserting all elements from an authoritative source; you cannot rehash the bit array itself.

In concurrent/race scenarios, `bits[i] |= mask` looks atomic but isn't in JavaScript across async boundaries — if you await between read and write, a concurrent insert can be lost. Either use `Atomics.or` on a SharedArrayBuffer, or serialize all bit-array mutations through a single queue. The collision-race demo must model this explicitly; otherwise users learn an incorrect lesson that bloom filters are "naturally thread-safe" when in fact they rely on the underlying bit operations being atomic.
