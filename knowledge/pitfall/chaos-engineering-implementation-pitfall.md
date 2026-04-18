---
version: 0.1.0-draft
name: chaos-engineering-implementation-pitfall
description: Common mistakes when building chaos-engineering tooling that make it unsafe or untrustworthy
category: pitfall
tags:
  - chaos
  - auto-loop
---

# chaos-engineering-implementation-pitfall

The biggest pitfall is treating chaos tooling like any other dashboard and forgetting the **abort path**. If the halt button is behind a modal, rate-limited, or depends on the same service being attacked (e.g., the control plane running on the cluster under test), the tool becomes a liability during a real gameday. Always make the abort synchronous, out-of-band from the target system, and idempotent — pressing it twice must never re-trigger the experiment. Related: never auto-resume an experiment after a page refresh; require explicit re-confirmation, because operators refresh when things look wrong.

A second common mistake is conflating **injected faults with observed faults**. If your UI shows "payment-svc is failing" without distinguishing "we injected this" from "this failed on its own as a side effect," post-mortem analysis becomes impossible. Always tag every fault event with its origin (`injected` | `propagated` | `organic`) and surface that tag in the timeline. Similarly, don't let simulated data paths and real fault-injection paths share code without a hard feature flag / environment guard — there are documented incidents where a "demo mode" shipped to prod and injected real faults.

Third, randomness without reproducibility kills trust. If entropy-dice rolls aren't seeded and logged, a surprising cascade can't be replayed, and the team stops running experiments. Persist `{seed, weights, graph_snapshot, timestamp}` for every run, and make "replay this scenario" a first-class button. Finally, beware of blast-radius math that assumes a static dependency graph — real systems have runtime-discovered dependencies (sidecars, lazy clients, cached DNS), so the computed radius is a lower bound, not a guarantee. Label it as such in the UI.
