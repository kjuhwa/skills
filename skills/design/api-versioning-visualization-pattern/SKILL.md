---
name: api-versioning-visualization-pattern
description: Visual language for API version lifecycle — horizontal timeline with lifecycle colors, side-by-side JSON diff panels, and traffic share charts
category: design
triggers:
  - api versioning visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# api-versioning-visualization-pattern

API versioning UIs share a consistent visual language across three viewpoints: a **horizontal lifecycle timeline** (SVG line + circle nodes spaced proportionally, alternating label positions above/below so crowded releases remain legible, with an enlarged current-version node), a **two-column JSON diff view** (left=from-version, right=to-version, with per-line highlight classes `line-add` / `line-rem` / `line-mod` derived by walking keys of both payloads), and a **traffic share dashboard** (stacked line/area canvas plus per-version stat cards anchored by a `border-top-color` matching the version).

The lifecycle status palette must be shared across all three views so a user can mentally link a color to a version across tools: `stable=#6ee7b7 (green)`, `current=#60a5fa (blue)` and noticeably larger radius, `deprecated=#fbbf24 (amber)`, `sunset=#f87171 (red)`, `beta=#60a5fa`. Status drives affordance too — sunset rows in a traffic log should show 410 responses at a nontrivial rate, current should pop visually. Render versions in release order (v1.0→v3.1), never alphabetical, and always include a release date label in muted color under each node.

For the diff panel specifically, compute a **risk score** (`removed*2 + modified*1`) and display a colored NONE/LOW/MEDIUM/HIGH badge — this is the single most useful summary widget because the raw diff doesn't convey breaking-change severity. Provide a swap button and endpoint selector so the same two panels serve every endpoint comparison; never split into per-endpoint screens.
