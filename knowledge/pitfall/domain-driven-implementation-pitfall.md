---
name: domain-driven-implementation-pitfall
description: Common failures when building DDD visualization and simulation tools that undermine their educational and operational value.
category: pitfall
tags:
  - domain
  - auto-loop
---

# domain-driven-implementation-pitfall

The most dangerous pitfall in DDD tooling is **static context boundaries with no integration concern labeling**. The bounded-context-map app shows this done right — each relation carries both a DDD pattern type ("ACL", "Customer-Supplier") and a concrete integration label ("Auth verification", "Fulfillment request"). Teams that build context maps with only the pattern type end up with diagrams that look correct but are useless for debugging integration failures, because "Conformist" between Inventory and Shipping tells you nothing about *what* conforms. Conversely, teams that label only the data flow ("warehouse sync") without naming the DDD relationship lose the ability to reason about power dynamics and dependency direction between teams. Always pair the structural pattern with the operational concern.

The second pitfall is **flat aggregate lifecycle modeling that hides invariant boundaries**. The aggregate-lifecycle simulator steps through commands linearly, which works for demonstration but obscures the fact that real aggregates reject invalid commands. A simulation that only shows the happy path (CreateOrder → AddItem → ConfirmOrder) teaches users that aggregates are state machines, but fails to teach them that aggregates are *guards*. The missing piece is command rejection — showing that `ShipOrder` before `ConfirmOrder` throws an invariant violation. Without rejection paths, developers treat aggregates as passive data containers rather than consistency boundaries, which is the single most common DDD implementation failure.

The third pitfall is **glossary tools that separate terms from code**. The ubiquitous-language explorer stores definitions as static JSON, which creates a maintenance gap — the glossary says "Repository: an abstraction for retrieving and persisting aggregates" but nothing links that definition to the actual `OrderRepository` interface in the codebase. Within weeks, the glossary drifts from reality. The `related` field helps with internal consistency but doesn't solve the code-glossary divergence. Effective ubiquitous language enforcement requires bidirectional binding: terms in the glossary should reference source-code symbols, and code review tooling should flag when new domain terms appear in code without a glossary entry.
