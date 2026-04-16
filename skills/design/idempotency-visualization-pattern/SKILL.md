---
name: idempotency-visualization-pattern
description: Visual dashboard pattern for rendering idempotency key lifecycle, cache hits, and duplicate request collapsing
category: design
triggers:
  - idempotency visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# idempotency-visualization-pattern

When building UIs around idempotency (key vaults, function playgrounds, retry simulators), structure the visualization around three synchronized panels: (1) an incoming request timeline showing raw client calls with their idempotency keys color-coded by hash, (2) a key-vault state table showing stored `(key, request_fingerprint, response, status, ttl)` tuples with visual markers for `IN_FLIGHT`, `COMPLETED`, and `EXPIRED` states, and (3) a response lane showing which calls returned cached responses vs. executed fresh. Use animated arrows or flowing particles to connect duplicate incoming requests to the single stored response, making the "collapse" effect visceral.

Render state transitions as discrete frames rather than continuous animation — idempotency is fundamentally about discrete request boundaries. Highlight the critical race window (between key-check and key-store) with a distinct color band so users can see where double-execution bugs hide. For retry storms, overlay a request-per-second histogram on the timeline and mark which bursts were absorbed by the cache vs. which bypassed it due to key mismatches or TTL expiry.

Always expose three user controls: a "fire duplicate" button (same key, same payload), a "fire collision" button (same key, different payload — should return 422), and a TTL slider. These three interactions cover the entire idempotency contract surface and let users build intuition without reading specs.
