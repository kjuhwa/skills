---

name: phase-window-timing-grade-with-pity
description: Rhythm-game timing mechanic that grades clicks by distance from a cyclic "golden window" center, with pity expansion after consecutive misses.
category: frontend
triggers:
  - phase window timing grade with pity
tags: [frontend, phase, window, timing, grade, pity]
version: 1.0.0
---

# phase-window-timing-grade-with-pity

Model any skill-check / timing minigame as three independent state pieces on each target: `phase` (0..1, advances by `dt/period` each tick and wraps), a `golden_window` half-width centered at phase 0.5, and a `pity` counter on the parent state. The grade of a user input is a pure function of circular distance from the window center: within 35% of half-width = "great", within half-width = "good", else "miss". Missing increments pity; hitting resets it. Pity adds a deterministic `pityBoost(p)` to the window half-width so players cannot fully stall out — great for soft anti-frustration without removing skill expression.

```js
function pityBoost(p){if(p>=12)return 0.55;if(p>=8)return 0.28;if(p>=5)return 0.15;return 0}
const half=(h.golden_window + pityBoost(state.pity))/2;
const dist=Math.min(Math.abs(h.phase-0.5), 1-Math.abs(h.phase-0.5)); // circular
if(dist < half*0.35) grade="great";
else if(dist < half) grade="good";
else grade="miss";
```

The window itself is trivially visualized as an absolutely-positioned strip inside a phase container: `left = (0.5 - halfWidth) * 100%`, `width = halfWidth*2 * 100%` — its width visibly grows as pity accrues, giving the player legible feedback. Pair with `divide-by-zero-rate-guard` (period must be clamped ≥ 1) and an event-returning reducer so `TICK` and `WIND` actions produce pure `{state, events}` pairs. Reusable anywhere a user "aims at a moving window": lockpicking, fishing, rhythm, canary-deploy confirmation prompts.
