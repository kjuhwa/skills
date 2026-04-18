---
version: 0.1.0-draft
name: quorum-visualization-off-by-one
description: Byzantine quorum threshold is ⌊2N/3⌋+1, not ⌈2N/3⌉ — the two diverge at N=3,6,9...
category: pitfall
tags:
  - hybrid
  - auto-loop
---

# quorum-visualization-off-by-one

When visualizing Byzantine consensus, the threshold `t > 2N/3` means you need **strictly more than** two-thirds, which equals `floor(2N/3)+1`. Using `Math.ceil(2*N/3)` gives the wrong answer whenever `2N` is divisible by 3 — e.g. at N=3 ceil gives 2 but you actually need 3 (since `2 > 2` is false). Similarly `Math.round` and naive `2*N/3` comparisons silently under-count.

```js
// WRONG: passes at N=3 with only 2 votes
if (votes >= Math.ceil(2*N/3)) commit();
// RIGHT
if (votes > 2*N/3) commit();
// or equivalently
if (votes >= Math.floor(2*N/3)+1) commit();
```

This bit us in a quorum gauge where the "safe" zone rendered one node too permissive at N=3,6,9. Always prefer the strict-inequality form `votes * 3 > 2 * N` (integer-safe, no floor/ceil ambiguity) and add a unit test covering N ∈ {1,2,3,4,6,7,9} — the edge cases where the naive and correct formulas diverge.
