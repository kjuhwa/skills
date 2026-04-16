---
name: bloom-filter-implementation-pitfall
description: Common pitfalls in bloom filter hash functions, sizing, and false-positive interpretation.
category: pitfall
tags:
  - bloom
  - auto-loop
---

# bloom-filter-implementation-pitfall

**Negative modulo from bitwise truncation.** The `| 0` trick used to keep hash values as 32-bit integers produces negative numbers when the high bit is set. A naive `h % size` then returns a negative index, causing out-of-bounds writes or silent bugs in typed arrays (which clamp to zero). All three apps use the `((h % size) + size) % size` guard, but forgetting this is the single most common bloom filter bug in JavaScript. In languages with unsigned types (Rust, Go) this isn't an issue, but in JS/Python/Java it must be handled explicitly.

**Seed-based "independent" hashes aren't truly independent.** The pattern `seed = i * 31 + 7` works for educational tools and low-stakes deduplication, but it produces correlated bit positions for short or similar strings. Two strings differing by one character can produce overlapping hash sets across seeds, inflating false-positive rates beyond the theoretical `(1 - e^(-kn/m))^k` formula. For production use, switch to double-hashing (`h1(x) + i * h2(x)`) or use MurmurHash3/xxHash with proper seed separation. The network visualization app makes this visible — add "cat" and "car" and watch how many bit positions overlap despite being different words.

**Small bit arrays saturate catastrophically.** The network app uses `BIT_SIZE=16` with 3 hashes, meaning each word sets 3 of 16 bits (18.75%). After just 4 seed words, up to 12 of 16 bits can be set (75% fill). At this density, almost any query returns "probably exists." The benchmark app demonstrates this: a 64-bit filter with 100 items and 4 hashes produces dramatically worse false-positive rates than a 256-bit filter with 3 hashes. The practical rule is to size the bit array at ~10x the expected item count per hash function (`m ≈ 10 * n * k`), but the small demo sizes in these apps intentionally violate this to make the failure mode visible.
