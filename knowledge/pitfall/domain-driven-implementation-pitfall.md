---
name: domain-driven-implementation-pitfall
description: Common failures in DDD visualization tools that undermine their modeling accuracy and educational value.
category: pitfall
tags:
  - domain
  - auto-loop
---

# domain-driven-implementation-pitfall

The most dangerous pitfall is **static context boundaries without integration concern labeling**. The context-map app renders relationships with DDD pattern types ("ACL", "Customer-Supplier", "Conformist") but the seed data carries only the structural label, not the operational concern it protects. Teams that build context maps with only the pattern type end up with diagrams that look correct but are useless for debugging integration failures — "Conformist" between Order and Shipping tells you nothing about *what* conforms. Effective context maps must pair every relationship with both the DDD pattern name and a concrete integration description (e.g., "Conformist: Order accepts Shipping's tracking schema as-is"). Without this dual labeling, the map becomes a taxonomy exercise rather than an operational tool.

The second pitfall is **flat aggregate modeling that hides invariant enforcement**. The aggregate-builder lets users add fields to entities and value objects but has no mechanism to define invariants, command rejection rules, or state transitions. This teaches users that aggregates are *data containers with named fields* rather than *consistency boundaries that reject invalid operations*. The event-storm compounds this by showing only the happy path (PlaceOrder→OrderPlaced→ReserveStock→StockReserved→ProcessPayment→PaymentConfirmed→OrderShipped) with no rejection branches. Real DDD aggregates spend more code on what they *refuse* than what they *accept*. A simulation missing `ShipOrder` failing before `ConfirmOrder`, or `ReserveStock` failing on insufficient inventory, teaches a fundamentally incomplete model of aggregate behavior.

The third pitfall is **ownership-blind element placement**. Both the aggregate-builder and event-storm treat all DDD elements as peer-level draggable nodes on a flat board. A Value Object (Money) can be dragged anywhere, detached from its owning Aggregate Root (Order), with no visual or structural enforcement of containment. This directly contradicts the DDD rule that entities and value objects within an aggregate are only accessible through the aggregate root. Similarly, the event-storm places Aggregates as free-floating sticky notes rather than as containers that *own* the command-handling and event-emitting behavior. Tools that flatten DDD's hierarchical ownership into a flat spatial canvas actively train users to ignore the boundaries that make DDD valuable.
