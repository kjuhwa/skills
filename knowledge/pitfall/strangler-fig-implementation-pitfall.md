---
name: strangler-fig-implementation-pitfall
description: Common failure modes when building strangler-fig migration tooling: premature legacy retirement, shadow drift, dependency blindness
category: pitfall
tags:
  - strangler
  - auto-loop
---

# strangler-fig-implementation-pitfall

The most frequent pitfall across these three apps is **premature legacy retirement** — the UI/simulator lets users mark an endpoint `retired` while live traffic (or simulated traffic) is still hitting it. The router then silently 404s or, worse, falls through to a default handler. Mitigation: enforce a `retired` transition guard that requires zero traffic for N consecutive ticks AND zero inbound dependencies, and surface a "retirement readiness" score on the node rather than a free-form button.

A related pitfall is **shadow drift**: when an endpoint is in `shadowing` state, both legacy and new handlers run and results are compared, but apps often forget to persist diff-rate metrics over time. A shadowing endpoint with a 2% diff rate looks "fine" until you realize it's been 2% for two weeks and nobody investigated. Always render a diff-rate sparkline per shadowed endpoint and block `canary` promotion if diff-rate > threshold.

Finally, **dependency blindness**: the vine-grower-style visual makes migration look like independent nodes, but real strangler-fig migrations have hidden coupling (shared sessions, shared DB tables, shared auth middleware). If your simulation doesn't model a `sharedState[]` field alongside `dependencies[]`, users will design migration orders that look valid topologically but deadlock on shared resources in production. Add a "shared-state conflict" detector that flags any two endpoints touching the same shared resource when one is `migrated` and the other is still `legacy`.
