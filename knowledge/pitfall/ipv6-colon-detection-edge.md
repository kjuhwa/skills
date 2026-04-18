---
name: ipv6-colon-detection-edge
version: 0.1.0-draft
tags: [pitfall, ipv6, colon, detection, edge]
category: pitfall
summary: Detecting IPv6 by colon count breaks on compressed notation — use a regex character class
source:
  kind: project
  ref: cygnus@cbb96a6dfff
confidence: medium
---

# IPv6 Detection Edge Case

## Fact
Compressed IPv6 notation (`2001:db8::1`) has fewer colons than full notation (`2001:0db8:0000:0000:0000:0000:0000:0001`). Utility code that masks/validates IP strings by counting colons will mis-classify compressed IPv6 as IPv4-with-port, or as plain text.

## Why
`::` collapses any run of all-zero groups, so colon count alone cannot distinguish IPv4 (with or without port) from compressed IPv6.

## How to apply
- Detect IPv6 by regex character class (`^[0-9a-fA-F:]+$` with `::` allowed), not by colon count.
- If you must keep a colon-count heuristic for speed, treat the ambiguous range (2–3 colons) as "parse fully or fall through to original input".
- The same utility was patched three times before landing on the right rule; write a unit test covering both full and compressed forms.
