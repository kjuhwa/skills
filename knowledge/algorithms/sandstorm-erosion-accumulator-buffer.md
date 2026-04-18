---
version: 0.1.0-draft
name: sandstorm-erosion-accumulator-buffer
description: Simulate progressive erosion/burial by accumulating wind deltas into a persistent height buffer sampled at render time.
category: algorithms
tags:
  - copper
  - auto-loop
---

# sandstorm-erosion-accumulator-buffer

"Sandstorms sculpting cities" implies irreversible geometric change over time, not just particle overlay. The pitfall is trying to mutate the actual city geometry per frame (expensive, non-reversible, hard to rewind). Better pattern: maintain a separate `Float32Array erosion[width*height]` buffer where each cell accumulates wind exposure. Render-time, sample the buffer and offset geometry vertically or alpha-blend accordingly.

```js
// Per tick: add wind contribution
for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
  const exposure = windField(x, y) * (1 - shelterMap[y*W+x]);
  erosion[y*W+x] += exposure * dt * 0.001;
}
// At render: offset building baseline
buildings.forEach(b => {
  const e = erosion[b.gy*W + b.gx];
  b.visibleHeight = b.height - Math.min(b.height, e * b.softness);
});
```

Key advantages: the buffer is cheap to snapshot (rewind/replay), decoupled from render geometry (swap visual styles freely), and naturally produces non-uniform erosion because `shelterMap` captures leeward protection. Reusable for snow accumulation, rust propagation, moss growth, dust settling — any phenomenon where exposure integrates over time into a visible geometric change.
