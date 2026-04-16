---
name: object-storage-implementation-pitfall
description: Common bugs in object-storage visualization — treemap proportionality distortion, hover/animation desync, and CLI parsing gaps.
category: pitfall
tags:
  - object
  - auto-loop
---

# object-storage-implementation-pitfall

**Treemap proportionality distortion:** When rendering buckets as CSS Grid columns proportional to their total size, applying a minimum width floor (`Math.max(w * 100, 10)` forcing every bucket to at least 10fr) violates the core treemap invariant that area equals data magnitude. A bucket holding 1% of total storage renders at the same width as one holding 10%, making small buckets appear 10x larger than they are. This is particularly dangerous in object-storage capacity dashboards where the whole point is spotting which bucket consumes the most space. Fix by either removing the floor and handling narrow columns with overflow tooltips, or switching to a squarified treemap algorithm that preserves proportionality while maintaining readable aspect ratios.

**Galaxy hover/animation desync:** When objects pulse via `radius * (1 + 0.3 * sin(t * 0.002 + phase))` but hover detection tests against the unpulsed base radius, users see their cursor inside the visual circle but get no tooltip — or worse, hovering on empty space triggers an adjacent object's tooltip because the detection threshold is a fixed pixel distance (`d < 30`) unrelated to the rendered size. The angle accumulator (`o.angle += o.speed` per frame) also grows unbounded; while trig functions handle large floats, the pulsing phase offset drifts relative to the orbit, causing subtle visual inconsistencies after extended runtime. Normalize angles with modulo `2*PI` and use the pulsed radius in hit-testing.

**Terminal command parsing and state management:** Splitting commands on whitespace (`raw.split(/\s+/)`) cannot handle object keys containing spaces or quoted arguments — `put mybucket "quarterly report.pdf"` parses the key as `"quarterly` and silently creates a corrupt entry. The `put` command also overwrites existing objects without warning, and `rm` is irreversible with no confirmation prompt. Combined with the lack of any persistence layer (no localStorage, no export), a single mistyped `rb` (remove bucket) destroys all objects in that bucket with no recovery path. For any object-storage CLI simulation, implement shell-style quote parsing, add `--force` flags for destructive operations, and persist state to localStorage so page refreshes don't reset the store.
