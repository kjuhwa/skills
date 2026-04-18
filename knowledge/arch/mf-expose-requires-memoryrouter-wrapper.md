---
version: 0.1.0-draft
tags: [arch, expose, requires, memoryrouter, wrapper]
name: mf-expose-requires-memoryrouter-wrapper
description: Components exposed via Module Federation that use react-router hooks must be wrapped in MemoryRouter at the expose boundary, not BrowserRouter and not a full-app router wrapper.
category: arch
confidence: high
source:
  kind: project
  ref: lucida-ui@4b922a9043
---

# Fact

When a React component is exposed through Module Federation and consumed by a remote served from a different dev-server origin (different port in dev, same origin in prod), the expose wrapper must provide its own `MemoryRouter`.

- `BrowserRouter` / `useNavigate` reach for the consumer's URL and break across origins, or collide with the consumer's existing router.
- Reusing the producer's full-app router (`withRouterWrapper`-style) boots the entire producer app just to render one component — heavy and prone to side effects.
- `MemoryRouter` gives the exposed subtree a self-contained history, isolated from the consumer.

# Why

Dev-time cross-origin (host on `:3000`, producer on `:3019`) exposes the router-context mismatch that production same-origin deploys can hide. Choosing `MemoryRouter` at the expose boundary eliminates the class of "works in prod, breaks in dev" Router errors and keeps expose weight low.

# How to apply

- Every expose wrapper file (`remotes/<producer>/src/remote-components/exposes/*.tsx`) that renders a component using `react-router` APIs should wrap the component in `<MemoryRouter>`.
- For navigation *outside* the embedded subtree (e.g. "go to main dashboard"), use `window.location.href` / `window.open` rather than the consumer's `useNavigate`.
- Do not place `BrowserRouter` in expose wrappers — the consumer will usually already have one.

# Counter / Caveats

- If the exposed component is pure (no router hooks), `MemoryRouter` is unnecessary overhead — skip it.
- If the consumer explicitly wants the exposed component to share its router (deep links, back-button), this rule inverts; evaluate per feature.
