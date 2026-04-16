---
name: oauth-visualization-pattern
description: Multi-panel SVG/CSS pattern for visualizing OAuth 2.0 flows, token structure, and scope-permission mappings in dark-themed educational UIs.
category: design
triggers:
  - oauth visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# oauth-visualization-pattern

OAuth visualization decomposes into three complementary views that together cover the full token lifecycle. The **flow diagram** uses an SVG canvas with hardcoded actor positions (User, Client, Auth Server, Resource Server) and animated dashed-stroke arrows drawn via `requestAnimationFrame` at ~0.04 progress per frame. Each flow (Authorization Code + PKCE, Implicit, Client Credentials) is modeled as a sequential array of `[source, destination, label]` tuples played back with 400ms inter-step delays, with a scrollable log console below that records each hop in `Source → Destination: message` format using cyan actor names and gray message text. The key insight is that OAuth flows are inherently sequential message exchanges, so a step-array with animated replay is the minimal correct abstraction.

The **token inspector** panel splits a JWT on `.` delimiters, applies base64url-to-base64 fixup (`-`→`+`, `_`→`/`), then `atob()`-decodes header and payload into syntax-highlighted JSON. A status badge uses three CSS states—`.valid` (green `#1a3a2a`), `.expired` (red `#3a1a1a`), `.soon` (orange `#3a2a1a`)—computed by comparing `exp` against `Date.now()/1000`. The regex-based syntax highlighter colors keys green, strings orange, numbers blue, and booleans purple against the dark background. Sample tokens are generated client-side via `btoa(JSON.stringify(claims))` with a mock signature suffix, cycling through user-session, expired-service-account, and group-membership scenarios.

The **scope playground** uses a two-panel grid layout (280px fixed left for scope toggles, flexible right for endpoints). Each scope is a CSS toggle switch built with `::after` pseudo-element animation (`left:2px` → `left:18px`), tracked in a `Set`. Endpoints evaluate `requires.every(r => activeScopes.has(r))` for AND-logic permission gating, rendering as green-unlocked or gray-locked cards with method badges. A live scope-string bar at the top shows the space-separated OAuth scope format. All three views share a GitHub Dark color palette (#0f1117 bg, #6ee7b7 accent, #c9d1d9 text) and are responsive via `min()` viewport clamping or grid breakpoints at 700px.
