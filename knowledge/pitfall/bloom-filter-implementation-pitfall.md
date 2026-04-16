---
name: bloom-filter-implementation-pitfall
description: Common bugs when implementing bloom filters in JS/TS demo apps
category: pitfall
tags:
  - bloom
  - auto-loop
---

# bloom-filter-implementation-pitfall

The most frequent bug is using `Math.random()` or a single weak hash as the basis for k "different" hash functions — this produces correlated bits and inflates false positive rate far above theoretical. Use k independent hash functions (e.g., FNV-1a with k different seeds, or the double-hashing trick `h_i(x) = h1(x) + i·h2(x) mod m` with two high-quality base hashes like murmur3). Never re-seed hashes between insert and query for the same element — the filter will silently return "not present" for items you just inserted. Cache the hash function set in state, not in a component render closure.

Bit storage is another trap: a naive `boolean[]` of length m is memory-wasteful and misrepresents the data structure. Use a `Uint8Array` of length `Math.ceil(m/8)` with bit-level `set(i)` / `get(i)` helpers, or at minimum a `Uint8Array(m)`. When m is driven by a slider and changes, always allocate a fresh array and re-insert — resizing in place is not supported by standard bloom filters (counting bloom filters are a different structure). Similarly, **never implement "remove"** on a standard bloom filter; clearing a bit may be shared with other inserted elements and will cause false negatives, which breaks the core guarantee.

Finally, watch the theoretical-vs-observed FPR display: the formula `(1 - e^(-kn/m))^k` assumes independent uniform hashing and becomes inaccurate for very small m or very large k/m ratios. If users see observed FPR diverge wildly from theory, it's almost always a hash-quality issue, not a formula issue — log the distribution of hash outputs modulo m and check for clustering before blaming the math. Also guard k=0 and m=0 edge cases at the slider boundary; they produce NaN in the FPR formula and a frozen UI.
