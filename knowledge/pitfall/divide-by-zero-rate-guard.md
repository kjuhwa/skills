---
version: 0.1.0-draft
name: divide-by-zero-rate-guard
description: Rate/throughput computations over rolling windows silently explode when the window contains only one sample or zero elapsed time.
category: pitfall
tags:
  - auto
  - auto-loop
---

# divide-by-zero-rate-guard

Across all three apps, the lag-rate, offset-velocity, and rebalance-frequency calculations all hit the same bug: `(offsetNow - offsetPrev) / (tNow - tPrev)` returns `Infinity` or `NaN` when the window is degenerate — first tick, paused simulation, or two events at the same timestamp. The resulting chart axis silently becomes `[0, Infinity]` and D3/Recharts render nothing, with no error.

**Why:** Streaming metrics often have irregular sampling. Replay/scrub UIs can land on identical timestamps. Pause-resume creates zero-elapsed gaps.

**How to apply:** Guard every rate computation with a minimum-denominator floor AND a sample-count check. Don't just check `dt > 0` — also require `samples >= 2`. Return `null` (not `0`) when the window is degenerate, so downstream code can distinguish "no data" from "flat zero." Filter `null` out before computing axis domains: `d3.extent(data.filter(d => d.rate != null))`.

```js
const rate = (samples.length >= 2 && dt > 1e-6) ? delta / dt : null;
```
