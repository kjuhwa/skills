---
version: 0.1.0-draft
name: twin-body-orbital-phase-offset
description: Render two orbiting bodies convincingly by phase-offsetting a shared sine driver rather than independent timers.
category: algorithms
tags:
  - copper
  - auto-loop
---

# twin-body-orbital-phase-offset

When rendering "twin moons" (or any paired orbital/oscillating bodies), the naive approach gives each body its own `Date.now() * speed` driver. This drifts over long sessions and makes synchronized choreography (eclipses, conjunctions, beat patterns) impossible to hit deterministically. The pattern: compute one phase `p = (t * omega) % (2*PI)` and derive each body as `{x: cx + r*cos(p + offset_i), y: cy + r_y*sin(p + offset_i)}`.

```js
const p = (now * 0.0003) % TAU;
moons.forEach((m, i) => {
  const phi = p + i * (TAU / moons.length) + m.eccentricity_offset;
  m.x = cx + m.rx * Math.cos(phi);
  m.y = cy + m.ry * Math.sin(phi) * m.tilt;
});
```

This lets you trigger "both moons aligned" by checking `abs(phi_0 - phi_1) % PI < epsilon`, enables tidally-locked pairs via equal offsets, and keeps floating-point drift bounded since the modulo clamps phase each frame. Generalizes to any N-body rhythmic system (pulsars, breathing UI elements, coordinated particle emitters).
