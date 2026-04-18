---
version: 0.1.0-draft
name: blue-green-deploy-implementation-pitfall
description: Common modeling mistakes when visualizing blue-green cutovers — instant flip, color-coded active state, ignored drain phase
category: pitfall
tags:
  - blue
  - auto-loop
---

# blue-green-deploy-implementation-pitfall

The most common pitfall is treating cutover as an atomic instant flip: setting `activeColor = "green"` in a single tick and immediately zeroing Blue's RPS. This misrepresents reality — real load balancers shift traffic over seconds and must drain in-flight requests on the retired side before it can be torn down. Users watching the dashboard miss the critical window where *both sides are serving traffic simultaneously*, which is exactly when subtle bugs (session affinity breakage, cache coherence, DB write conflicts between versions) surface. Always model the cutover as a ramped interval with overlapping traffic, and keep a visible "draining" state on the retired side until its in-flight counter reaches zero.

A second pitfall is recoloring the active side (e.g. always painting the active environment green and the idle one blue). This destroys the fundamental identity of blue-green — Blue and Green are *fixed labels for two physical environments*, not statuses. After one cutover, Green is active; after the next, Blue is active again. Recoloring makes the history strip incoherent and confuses operators who refer to "the blue cluster" by name in runbooks and alerts. Lock the colors to the environment identity and express active/idle via border glow, pills, or connection-line style instead.

A third pitfall is omitting the rollback path or making it symmetric to the forward cutover. Rollback is almost always *faster and less ceremonious* than a forward deploy — no warm-up, no smoke tests, just flip the router back because the old side is still warm and healthy. Simulators that force a full forward-deploy state machine for rollback mislead users about incident-response timelines. Also beware of the "rollback window expired" trap: once the retired side has been drained and reclaimed (instances terminated or repurposed), rollback is no longer a simple router flip — it becomes a full redeploy. The UI must make this transition explicit, typically by graying out the rollback button once drain completes.
