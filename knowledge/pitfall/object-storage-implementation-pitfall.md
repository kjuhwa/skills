---
name: object-storage-implementation-pitfall
description: Common failure modes when building object storage visualizations — broken resize, treemap degeneration, counter jitter, and size formatting overflow.
category: pitfall
tags:
  - object
  - auto-loop
---

# object-storage-implementation-pitfall

**Resize and coordinate drift.** All three apps bind to `window.resize` to recalculate canvas/container dimensions, but the galaxy and flow apps compute bucket Y-positions only once at startup (`bucketY.push(80 + i * ...)` using the initial `H` value). After a resize, the orbit center updates but bucket swim-lane positions in the flow view become stale, causing particles to fly to old Y coordinates while the storage node redraws at the new center. The fix is to recompute all layout-dependent constants (orbit radii, swim-lane Y offsets, treemap rectangles) inside the resize handler, not just `W` and `H`. The treemap app avoids this by re-calling `render()` on resize, but at the cost of destroying and recreating all DOM nodes — for large bucket counts this causes visible flicker and layout thrashing.

**Treemap squarify degeneration.** The simplified squarify algorithm used alternates horizontal/vertical slicing based on which dimension is larger, but it does not implement the full Bruls-Huetink-van Wijk squarify algorithm. When bucket sizes are highly skewed (e.g., `backups` at 1 TB vs. `static-cdn` at 19 GB — a 54:1 ratio), the smallest buckets collapse into slivers less than 1px wide, making their labels unreadable and click targets impossibly small. The `Math.max(iw, 1)` guard prevents zero-width nodes but not practical usability. Production implementations should enforce a minimum cell dimension (e.g., 40px) and collapse remaining small buckets into an "others" aggregate node.

**Counter smoothing and ghost throughput.** The exponential moving average for operation counters (`ups += (u - ups) * 0.1`) never fully reaches zero — when no new uploads spawn, the counter asymptotically approaches but never displays `0/s`, leaving phantom throughput on screen. Multiplying particle count by a constant to fake throughput (`(ups + dns) * 1.4` MB/s) also means throughput claims have no relationship to actual simulated object sizes, which can mislead users comparing the visualization against real monitoring dashboards. The delete counter is not included in throughput calculation, which is correct for bandwidth but may confuse viewers expecting "operations/s" semantics. Size formatting is also incomplete: the galaxy app handles only GB/TB but the treemap handles GB/TB/PB — inconsistent formatters across views of the same data will show different labels for the same bucket.
