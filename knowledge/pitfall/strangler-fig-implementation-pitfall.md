---
name: strangler-fig-implementation-pitfall
description: Common failure modes when building strangler-fig visualizations and migration trackers — host-fade timing, progress inflation, and stage-skip bugs.
category: pitfall
tags:
  - strangler
  - auto-loop
---

# strangler-fig-implementation-pitfall

**Host fade desynchronization.** The simulator ties host opacity to `year / 80`, but root growth is governed by per-root `growth * speed * 0.1`. If the speed slider is cranked to max, the host can visually disappear while roots are only 60% grown — the user sees an empty canvas with floating green lines. The fix is to derive host fade from **aggregate root progress** (`sum(length) / sum(maxLen)`) rather than from an independent time variable. In real migration dashboards this manifests as the legacy system being decommissioned (load balancer cutover, DB shutdown) before all downstream consumers have been re-pointed, because the "overall timeline" metric diverged from actual per-service readiness. Always gate host decommission visuals on the **slowest migrating component**, not on elapsed time.

**Progress inflation via stochastic advancement.** The migration tracker advances by `random(15) + 8` per click, meaning 5–7 clicks completes any service regardless of its LOC count or complexity. A 6.7k-LOC Notification Hub and a 31.2k-LOC Report Engine reach 100% in roughly the same number of interactions. This makes the simulation feel unrealistic and, worse, trains stakeholders to underestimate large migrations. The fix is to scale advancement inversely with complexity: `advanceAmount / (lines / baselineLines)`, so the Report Engine requires 4–5x more clicks than Notification Hub. Without this weighting, your dashboard becomes a vanity metric — everything looks green while the hardest work remains undone.

**Stage-skip and boundary bugs.** The ecosystem app allows clicking a freestanding (stage 3) fig with no effect, which is correct — but the simulator has no upper-bound guard on `year`, which climbs indefinitely after all roots hit `maxLen`, giving a misleading "Year: 847" readout. The migration tracker clamps progress at 100 via `Math.min(100, ...)` but never prevents re-clicking a migrated service (it silently no-ops). These boundary conditions compound in production: a service marked "migrated" that still receives legacy traffic, a timeline that keeps ticking after cutover, or a stage transition that skips "strangling" and jumps directly to "freestanding" because two rapid clicks fired before the re-render. Always enforce **monotonic, bounded state machines** with explicit guards at each transition edge, and freeze the global clock when the terminal state is reached.
