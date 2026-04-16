---
name: chaos-engineering-visualization-pattern
description: Render chaos experiments as blast-radius graphs, SLO burn-down curves, and experiment timeline decks with clear safety boundaries
category: design
triggers:
  - chaos engineering visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# chaos-engineering-visualization-pattern

Chaos engineering UIs share three canonical views that should be composed rather than invented per-app. First, a **blast-radius graph** renders the service topology as concentric rings around the fault injection target: inner ring = directly impacted service, middle ring = downstream dependents detected via traces, outer ring = indirect blast (shared infrastructure). Color nodes by health state (`healthy` green, `degraded` amber, `failing` red, `isolated` gray) and draw edges weighted by request volume so operators see at a glance whether a 5% CPU fault is bleeding into tier-1 services. Always overlay the pre-declared "abort boundary" as a dashed ring — crossing it triggers the kill switch.

Second, the **SLO burn-down curve** plots error-budget consumption against experiment duration on a dual-axis chart: left axis shows budget remaining (%), right axis shows burn rate multiplier (1x = normal, 14.4x = fast-burn threshold). Shade the area under the curve red once burn rate crosses the configured threshold, and annotate with the exact timestamp the abort SHOULD have fired. This makes post-mortem review trivial — you can literally point at the shaded wedge and say "we kept injecting faults for 47 seconds past the abort line."

Third, the **experiment deck** is a card-based timeline where each card represents one hypothesis (`inject=latency_500ms, target=payment-svc, expected=checkout_p99<2s`). Cards have four states (`staged`, `running`, `passed`, `failed`) with distinct visual treatments — never rely on color alone, use icons + border style for accessibility. Clicking a card expands inline to show the live blast-radius graph and SLO curve scoped to that experiment, avoiding modal dialogs that hide context.
