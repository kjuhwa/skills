---
name: circuit-breaker-visualization-pattern
description: Three-state visual encoding for circuit breaker status using SVG rings, wire diagrams, and badge indicators with consistent color semantics.
category: design
triggers:
  - circuit breaker visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# circuit-breaker-visualization-pattern

Circuit breaker visualizations rely on a strict three-color mapping applied consistently across all visual elements: green (#6ee7b7) for CLOSED (healthy), red (#f87171) for OPEN (tripped), and amber (#fbbf24) for HALF_OPEN (probing). This palette is applied to SVG strokes, fill backgrounds with transparency (e.g., `#6ee7b722`), badge labels, text fills, and log entry classes. The state label always renders the enum with underscores replaced by spaces. Three proven visual metaphors emerge: (1) a ring/arc gauge where `stroke-dashoffset` maps the failure ratio to a circular progress indicator, (2) an inline wire-and-rect SVG where the breaker rectangle swaps class (`open`, `half`) to animate fill/stroke transitions, and (3) per-service cards with a canvas sparkline whose bar and line colors reflect the current state. All three use CSS `transition` on color and dimension properties (0.3s-0.4s) so state changes animate smoothly rather than snapping.

The dashboard pattern scales to N services by dynamically creating card elements from a service name array, each with its own canvas context and rolling history buffer (fixed-length array with `push/shift`). The sparkline renders both filled bars (semi-transparent) and a stroke-path line overlay, giving at-a-glance throughput history per breaker. A status badge in the card header provides the discrete state, while numeric stats (req/s, failure count, latency) sit below the chart. The single-breaker visualizer uses an SVG `<circle>` arc with `stroke-dasharray/dashoffset` to encode failure-to-threshold ratio as angular progress, paired with a scrollable log panel where entries are color-classed (`fail`, `ok`, `warn`) and prepended newest-first.

For the interactive simulator variant, a horizontal wire-source-breaker-destination SVG gives an electrical-circuit mental model. The destination node toggles a CSS class (`off`) to turn red when the circuit is OPEN, reinforcing that downstream is unreachable. A progress meter bar beneath the diagram fills proportionally to `failures/threshold` and flips to a `danger` class at 80%+, providing a visual early-warning before the breaker trips. Configurable sliders (failure rate, threshold, timeout) sit between the circuit diagram and the event ticker, giving users direct control over simulation parameters.
