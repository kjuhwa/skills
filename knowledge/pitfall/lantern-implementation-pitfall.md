---
version: 0.1.0-draft
name: lantern-implementation-pitfall
description: Common failure modes when building lantern visualizations: additive-blend saturation, flicker desync, and ember leak
category: pitfall
tags:
  - lantern
  - auto-loop
---

# lantern-implementation-pitfall

The most common visual failure is additive-blend saturation: when 20+ lantern halos overlap, the cumulative `'lighter'` composite clips to pure white and the scene loses its warm amber character, looking like a flashlight convention instead of a lantern festival. Mitigate by capping per-halo alpha at 0.15, using a pre-multiplied warm tint (rgb ~ 255,180,90) rather than pure white, and applying a final full-screen tone-map pass (multiply by 0.88, then add subtle blue-shadow in the 0.0–0.2 luminance range) to reintroduce contrast. Do not try to fix this by lowering halo count — it destroys the atmospheric density that makes lantern scenes feel magical.

Flicker desync is the second pitfall: if each lantern advances its flicker phase by `Math.random() * dt`, frames where `dt` spikes (tab backgrounded, GC pause) cause visible phase jumps and the fleet looks like broken Christmas lights. Always drive flicker from `Math.sin(elapsed * freq + perLanternOffset)` where `elapsed` is the monotonic shared clock and `perLanternOffset` is assigned once at spawn. Similarly, do not reset `elapsed` on tab refocus — cap `dt` at 100ms instead so physics stays stable without losing phase coherence.

Ember particle leaks are the sneaky one: particles emitted when a lantern drifts off-screen (drifting-ember-flight) or when the composer rapid-fires releases must be culled against both viewport bounds AND a hard `maxAge` (typically 2.5s). Teams frequently add the viewport cull but forget maxAge, so embers from a lantern that flew up and out keep accumulating in the particle array forever — after ~5 minutes the array hits 10k+ entries and framerate collapses. Audit the particle pool size in devtools during long demo sessions, not just on initial load.
