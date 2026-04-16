---
name: domain-driven-data-simulation
description: Generating realistic bounded-context fixtures, aggregate event histories, and glossary drift for DDD demos
category: workflow
triggers:
  - domain driven data simulation
tags:
  - auto-loop
version: 1.0.0
---

# domain-driven-data-simulation

Seed each demo with a cohesive fictional business (e.g. a logistics SaaS) so the three apps share aggregate names, context boundaries, and vocabulary — this lets users mentally cross-reference. Generate 4–7 bounded contexts (Shipping, Billing, Customer, Routing, Tracking, Compliance, Pricing) with explicit upstream/downstream relationships drawn from the context-mapping patterns. For aggregate-event-stream, generate per-aggregate histories of 30–120 events using a weighted transition model: given state X, pick next command from a realistic distribution (Invoice: Draft 60%→Issued 30%→Paid 8%→Voided 2%), then emit the corresponding event plus occasional policy-triggered side-event chains in neighboring contexts.

For the glossary, deliberately inject ubiquitous-language drift: the word "Customer" should have 3 definitions (sales-context Lead, shipping-context Consignee, billing-context Payer), "Shipment" should overlap with "Parcel" and "Consignment" with asymmetric preferences per context. Generate ~40–80 terms with 15–25% intentional cross-context collision rate — too low and the glossary feels pointless, too high and it looks contrived. Timestamp every event and term-definition with a deterministic seed so replay and diff views are stable across reloads.

Persist fixtures as static JSON keyed by context slug; hydrate lazily on first viewport entry to keep initial load under 200ms. Expose a "regenerate with seed" control so reviewers can reproduce exact states when filing issues.
