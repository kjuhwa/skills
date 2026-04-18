---
version: 0.1.0-draft
name: variable-length-integer-encoding-for-metrics-bandwidth
summary: Scouter's DataOutputX uses 3-byte (INT3) and 5-byte (LONG5) integer encodings to shrink UDP metric packs by 20-40% when most values fit within 24 / 40 bits
category: decision
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/kjuhwa/scouter
source_ref: master
source_commit: 126bb19f07d1fe4fe915eb408c381e2c140cc94c
source_project: scouter
tags: [varint, encoding, perf, decision, scouter]
---

## Fact

Response times in milliseconds rarely exceed ~16.7M (fits in 24 bits / 3 bytes); epoch timestamps in ms fit in 40 bits (5 bytes) until year 2242. Scouter exploits this with fixed-size variable-length int/long writers (INT3, LONG5) rather than zig-zag varints or standard 4/8-byte writes. The decoder must know the schema (no inline type tag) — this is acceptable because reader and writer are lock-stepped by version. Measured savings: 20–40% on typical metric packs, which is meaningful for UDP where exceeding MTU triggers IP fragmentation and drops.

## Evidence

- `scouter.common/src/main/java/scouter/io/DataOutputX.java` — writeInt3, writeLong5

## How to apply

When designing a wire format with known value ranges and a versioned reader/writer pair, consider fixed-size shorter encodings before reaching for Protobuf varints. Fixed-size is branchless, cache-friendly, and easier to align. If ranges are genuinely open-ended (e.g. counts that can overflow 32-bit), stick with full width or a proper varint.
