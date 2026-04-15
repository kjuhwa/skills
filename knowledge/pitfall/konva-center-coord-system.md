---
name: konva-center-coord-system
description: Konva node coordinates can be center-based; when converting to top-left boxes subtract half width/height
type: pitfall
category: pitfall
source:
  kind: project
  ref: lucida-builder-r3@97ceb3a1
confidence: medium
---

# Fact
When computing bounding boxes from Konva node `attrs`, the position can be the node's center, not its top-left. Treating it as top-left produces off-by-half-size errors for hit testing, snapping, and alignment guides.

**Why:** Konva allows offset/origin configuration per node; the project's canvas uses center-origin in several layer types.

**How to apply:**
- Before comparing positions across layer types, normalize to a single origin (usually top-left): `x - width/2`, `y - height/2`.
- Snap/grid/alignment utilities should consume the normalized box, not raw `attrs.x` / `attrs.y`.

## Counter / Caveats
- Not every layer uses center origin. If a layer was added with top-left origin, the normalization is a no-op — but leaving the normalization in is still safe.
