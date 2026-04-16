---
name: object-storage-implementation-pitfall
description: Common bugs in object-storage visualizations including treemap proportionality distortion, orbital hover desync, and lifecycle particle leaks.
category: pitfall
tags:
  - object
  - auto-loop
---

# object-storage-implementation-pitfall

**Treemap proportionality distortion**: The squarified layout divides space by `totalSize(n)/total` fraction, but when a bucket has deeply nested prefixes with small leaf sizes, rounding errors in pixel positions accumulate. A bucket with `{daily: 2000, weekly: 2500, monthly: 1000}` rendered into a 700×420px map loses sub-pixel accuracy at each nesting level. The symptom is that the sum of child rectangles doesn't fill the parent — leaving 1-2px gaps or overlaps. The fix requires flooring/ceiling coordinates at each level and assigning any remainder to the last child. Additionally, the drill-down breadcrumb uses `current = data; path.slice(1).forEach(p => current = current.children.find(c => c.name === p))` which crashes with "Cannot read property 'find' of undefined" if a prefix name is duplicated across buckets (e.g., two buckets both having a `thumbs/` prefix) — the path must store indices, not names.

**Galaxy orbital hover desync**: The tooltip hit-test computes star positions using `cx + Math.cos(s.angle) * s.r` at mousemove time, but the animation loop updates `s.angle += s.speed` asynchronously in `requestAnimationFrame`. At high frame rates this is invisible, but on throttled/background tabs where rAF fires at 1-2 fps, the mousemove reads stale `angle` values and the tooltip attaches to where the star *was* 500ms ago, not where it visually appears. The fix is to cache the last-rendered `(sx, sy)` per star and hit-test against those cached positions. **Lifecycle particle memory leak**: The flow pattern sets `alive: false` but never prunes the particles array, so after extended use the array grows unbounded, and the `forEach` loop iterates over thousands of dead particles doing only an `if(!p.alive) return` check. In production dashboards left open for hours, this causes measurable GC pressure. A periodic compaction (`particles = particles.filter(p => p.alive)` every N frames, or swapping to a ring buffer) is necessary for long-running deployments.
