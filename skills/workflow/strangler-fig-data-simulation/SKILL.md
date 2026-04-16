---
name: strangler-fig-data-simulation
description: Incremental module-by-module migration simulation with independent growth rates, stochastic advancement, and tri-state lifecycle tracking per service.
category: workflow
triggers:
  - strangler fig data simulation
tags:
  - auto-loop
version: 1.0.0
---

# strangler-fig-data-simulation

The data simulation pattern models each migratable unit as an independent entity with its own progress curve. In the simulator, each root has `{length, maxLen, growth, angle}` — growth per tick is `growth * speed * 0.1`, meaning entities advance at different rates even under the same global speed multiplier. This mirrors real strangler-fig migrations where services like Auth (small, well-bounded) complete before monoliths like Report Engine (31.2k LOC, cross-cutting). The migration tracker seeds realistic asymmetry via `SERVICES[]` with per-service `lines` (complexity proxy), `team` (ownership), `status` (legacy/inprogress/migrated), and `progress` (0–100). Advancement is stochastic: `Math.floor(Math.random() * 15) + 8` yields 8–22% per click, preventing uniform-looking simulations. Status transitions are derived, not set: `progress >= 100 → migrated`, `progress > 0 → inprogress`, else `legacy`.

The ecosystem app models biological lifecycle stages (`seed → epiphyte → strangling → freestanding`) as a discrete 0–3 integer, with each stage transition incrementing `age` by `random(20) + 10` years and growing the visual radius by 4px (capped at 42). This two-variable advancement (stage + age) prevents unrealistic jumps — a fig doesn't go from seed to freestanding overnight. When adapting this to software migration, map stage to architectural coupling (e.g., 0 = facade only, 1 = read path migrated, 2 = write path migrated, 3 = legacy decommissioned) and age to calendar time or sprint count.

A key reusable pattern across all three apps is **global time with local rates**: the simulator has a single `year` counter incremented by `speed * 0.05` while each root advances by its own `growth` factor; the migration tracker has a global progress bar that aggregates independent per-service percentages. This separation lets you model portfolio-level cadence (quarterly reviews, release trains) while respecting that each team migrates at its own pace. Seed your simulation data with realistic LOC counts and team assignments to surface bottlenecks — the 31.2k-LOC Report Engine at 0% progress immediately flags the hardest migration, which is exactly the kind of early signal a strangler-fig dashboard should surface.
