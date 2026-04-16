---
name: idempotency-visualization-pattern
description: Canvas heatmap grid that color-codes API endpoints by duplicate-call impact, distinguishing idempotent (GET/PUT/DELETE) from non-idempotent (POST/PATCH) methods in real time.
category: design
triggers:
  - idempotency visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# idempotency-visualization-pattern

The core pattern is a grid where each cell represents a unique (HTTP method, endpoint path) pair. Cells are classified as idempotent or non-idempotent based on the HTTP verb — GET, PUT, and DELETE are safe to retry, while POST and PATCH accumulate side-effects. A randomized traffic burst simulation increments each cell's call count, but the effects counter diverges: idempotent cells clamp effects to 1 regardless of call count, while non-idempotent cells increment effects linearly with calls. This single divergence drives the entire color-mapping logic.

Color interpolation encodes severity. Idempotent cells remain in a cool green spectrum (#3b8268 → #6ee7b7) even under heavy retry load, visually proving safety. Non-idempotent cells transition from green through warm amber to hot red using a ratio of `min(effects/5, 1)` mapped onto an RGB channel blend (`r: 110→255, g: 231→51, b: 183→68`). A mouseover tooltip per cell shows exact call count vs. effect count, letting observers verify that idempotent endpoints absorb retries while non-idempotent ones accumulate damage.

The reusable structure is: define a typed cell model (`{method, path, idempotent, calls, effects}`), a deterministic color function driven by the idempotent flag and effect ratio, and a timed simulation loop that randomly targets cells. This separates domain classification (which verbs are safe) from visualization (how severity maps to color), making it adaptable to any domain where you need to show "safe retry vs. dangerous retry" across a matrix of operations.
