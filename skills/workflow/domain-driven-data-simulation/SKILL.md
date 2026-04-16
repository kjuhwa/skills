---
name: domain-driven-data-simulation
description: Structured command-event-aggregate data modeling for DDD context maps, event storms, and aggregate internals
category: workflow
triggers:
  - domain driven data simulation
tags:
  - auto-loop
version: 1.0.0
---

# domain-driven-data-simulation

The three apps define domain data as flat JavaScript object arrays with a consistent schema per DDD concern. **Context Map** models bounded contexts as `{id, label, x, y, r, desc}` and relationships as `{from, to, type, color}` where `type` is one of the six DDD context-mapping relationship patterns (Partnership, Customer-Supplier, Conformist, Shared Kernel, Anti-Corruption Layer, Published Language). **Event Storm** models sticky notes as `{type, text, x, y}` where `type` ∈ {command, event, aggregate, policy} — the ordering in the mock array encodes the causal flow (command → event → policy → next command). **Aggregate Explorer** models each aggregate as `{name, root, entities[], values[], invariants[]}`, cleanly separating the three DDD tactical building blocks (entity, value object, invariant) under an aggregate root.

To simulate realistic DDD data, use an e-commerce domain as the canonical example: Order, Customer, Product, Inventory, Shipping, Billing bounded contexts with cross-context relationships that exercise every relationship type. Inside each aggregate, maintain 1 root entity, 1-3 child entities, 2-4 value objects, and 1-3 business invariants — this ratio mirrors real-world aggregates that are small enough to be transactional. Event storms should follow command-event pairs: `PlaceOrder→OrderPlaced`, `ReserveStock→StockReserved`, `ProcessPayment→PaymentConfirmed`, with policies bridging events to downstream commands (`When OrderPlaced → Reserve Stock`). This chain structure makes temporal causality visible.

When generating new domain simulations, the key rule is: every bounded context should own at least one aggregate, every aggregate must have at least one invariant (otherwise it's just a data bag, not a true aggregate), and every cross-context relationship must be typed — untyped lines between contexts are a DDD anti-pattern because they hide integration complexity. Value objects should be genuinely immutable concepts (Money, Address, SKU) not just wrapper strings. Policies should be named as "When [Event] → [Command]" to make the reactive flow explicit rather than burying it in prose descriptions.
