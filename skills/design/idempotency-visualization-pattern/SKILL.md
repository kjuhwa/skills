---
name: idempotency-visualization-pattern
description: Visualize idempotent vs non-idempotent behavior using side-by-side panels, animated request flows, and divergence graphs.
category: design
triggers:
  - idempotency visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# idempotency-visualization-pattern

The core visualization pattern for idempotency uses a **dual-panel comparison layout** where one side shows a non-idempotent operation (e.g., POST /pay that charges on every call) and the other shows an idempotent operation (e.g., PUT /pay that charges only once regardless of retries). Each panel maintains an append-only request log with color-coded entries — green (#6ee7b7) for first-time successful effects, red (#f87171) for duplicate/cached responses — and a running total that proves the side-effect count. A shared canvas bar chart plots "Requests vs Effects" for both paths, making the divergence between request count and side-effect count visually obvious: the non-idempotent bar grows linearly while the idempotent effects bar flatlines at 1.

For deeper architectural understanding, an **SVG animated request-flow diagram** shows requests traveling from Client → Server → Database nodes. When a request carries a previously-seen idempotency key, the animation short-circuits at the server node and returns a "200 OK (cached)" label in red, never reaching the database. New keys animate the full path through to the database with a "201 Created" response. A live **Key Store** panel below renders all seen idempotency keys as tagged chips with their status, highlighting duplicates with a red border. This pattern makes the server-side deduplication mechanism tangible — users see that the key store is the gate that prevents duplicate side effects.

For mathematical proof of idempotency, a **convergence graph** applies a function N times to an input and plots the output sequence. Idempotent functions (abs, floor, max(x,0)) produce flat lines after the first application (f(f(x)) = f(x)), drawn with solid strokes. Non-idempotent functions (x*2, x+1) produce diverging lines drawn with dashed strokes. Card-based summaries per function show the full application chain (e.g., 7 → 7 → 7) with a badge verdict. This three-layer approach — behavioral sandbox, network-flow animation, mathematical proof — covers idempotency from API design through to formal definition.
