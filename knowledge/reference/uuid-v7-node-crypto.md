---
version: 0.1.0-draft
name: uuid-v7-node-crypto
summary: Generate RFC 9562 UUID v7s in Node without a dependency — top 48 bits are `Date.now()` (big-endian ms), version/variant nibbles are patched into `crypto.randomBytes(10)`, output is the standard `8-4-4-4-12` hex form. IDs sort by creation time, which makes them ideal keys for append-only JSONL.
category: reference
confidence: medium
tags: [uuid, uuid-v7, rfc-9562, node, crypto, time-ordered-id]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 4c51382092f9cb125d3ec55475861ead8d1463a6
source_project: evolver
imported_at: 2026-04-18T02:45:00Z
---

# UUID v7 in Node (no dependency)

## Why v7 specifically

- **Time-sortable.** The first 48 bits are `unix_ts_ms`, so lexicographic sort = chronological sort.
- **Still random enough.** The remaining 74 bits are random; collisions within a millisecond are negligible in practice.
- **Database-friendly.** B-tree inserts stay near the end of the index instead of scattering (the UUID v4 problem).
- **JSONL-friendly.** Append-only logs stay naturally ordered; you can binary-search by time without a separate timestamp column.

## Layout (RFC 9562)

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                          unix_ts_ms                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          unix_ts_ms           | ver(0b0111) |    rand_a       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|var(0b10)|                rand_b                                |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                            rand_b                             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

- Bits 0–47: `unix_ts_ms` big-endian.
- Bits 48–51: version = `0b0111` (7).
- Bits 52–63: `rand_a` (12 bits of random).
- Bits 64–65: variant = `0b10`.
- Bits 66–127: `rand_b` (62 bits of random).

## Zero-dep implementation (Node ≥ 14)

Taken from evolver's `src/proxy/mailbox/store.js`:

```js
const crypto = require('crypto');

function generateUUIDv7() {
  const now = Date.now();
  const msHex = now.toString(16).padStart(12, '0');

  const bytes = crypto.randomBytes(10);
  bytes[0] = (bytes[0] & 0x0f) | 0x70; // version 7
  bytes[2] = (bytes[2] & 0x3f) | 0x80; // variant 10

  const randHex = bytes.toString('hex');

  // Standard UUID format: 8-4-4-4-12 (32 hex total)
  return [
    msHex.slice(0, 8),
    msHex.slice(8, 12),
    randHex.slice(0, 4),
    randHex.slice(4, 8),
    randHex.slice(8, 20),
  ].join('-');
}
```

Note the byte layout: `msHex` contributes the first 12 hex chars (48 bits of timestamp), then `randHex[0..4]` carries the `version=7` nibble in its first hex digit, and `randHex[4..8]` carries the `variant=10` nibble in its first hex digit.

## Gotchas

- **Clock skew = ordering skew.** If the host clock jumps back (NTP correction, VM pause), newer IDs can sort before older ones. For strict monotonicity within a process, maintain a "last-seen ms" guard and bump by 1 when `Date.now()` would regress.
- **Not suitable as a public identifier for authorization.** The timestamp is recoverable from the first 12 hex chars; don't use it as a capability token.
- **Millisecond resolution.** Within a single ms, two IDs rely entirely on `rand_a` + `rand_b` for ordering — the sort within that ms is effectively arbitrary.

## Source

- RFC 9562 (UUID v6/v7/v8).
- Evolver, `src/proxy/mailbox/store.js` — `generateUUIDv7()` and its use as message IDs in the local JSONL mailbox.
