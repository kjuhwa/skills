---
name: hexagonal-architecture-implementation-pitfall
description: Common mistakes when building hexagonal architecture visualizations — inverted dependencies, layer-bypass edges, and coordinate/rendering order bugs.
category: pitfall
tags:
  - hexagonal
  - auto-loop
---

# hexagonal-architecture-implementation-pitfall

The most dangerous pitfall is **inverted dependency direction**. In hexagonal architecture, the Dependency Rule mandates that outer layers (adapters) depend on inner layers (ports/domain), never the reverse. When building edge data or animating flows, it is easy to accidentally create domain→adapter edges (e.g., `['OrderEntity', 'PgRepo']` instead of routing through a port). The dependency-map app correctly enforces this by inserting an `OutPort` between entities and repositories (`OrderEntity → SaveOrderPort → PgRepo`), but the flow-simulator shortcuts this by animating directly from adapter to domain center, skipping the port layer entirely in its particle path. Any visualization that omits the port intermediary teaches the wrong mental model — requests must always transit through a port interface, and this should be visible in both the data model and the animation path.

The second pitfall is **layer-bypass connections** — adapter-to-adapter edges like `['PgRepo', 'RedisCache']`. The dependency-map app includes this edge, which technically violates hex-arch purity: Redis caching should be behind its own port, not directly coupled to the Postgres adapter. When extracting reusable patterns, edge validation should reject same-layer connections (especially adapter↔adapter) or at minimum flag them as architectural warnings. A simple guard is: `if (nodes[fromId].layer <= nodes[toId].layer) warn('outward or lateral dependency')` — valid edges always go from higher layer index toward lower (adapter→port→domain).

The third pitfall is **rendering order and coordinate bugs**. All three apps render hexagon rings in reverse order (outermost first) so inner rings paint over outer fill — if this is inverted, the domain core becomes invisible behind adapter fill. Similarly, when mixing Canvas and SVG or when the SVG viewBox dimensions differ from the DOM element size, drop coordinates must be scaled (`cursorPos * (viewBoxSize / domRect)`) or components land in wrong positions. The layer-builder app handles this with explicit `scaleX/scaleY` factors, but hardcodes the viewBox dimensions (700x500) rather than reading them from the SVG element — a fragile pattern that breaks if the viewBox is ever resized. Always derive coordinate transforms from the live SVG `viewBox` attribute.
