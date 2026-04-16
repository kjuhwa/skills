---
name: domain-driven-data-simulation
description: Generate synthetic bounded-context + aggregate + event datasets to drive DDD visualization demos
category: workflow
triggers:
  - domain driven data simulation
tags:
  - auto-loop
version: 1.0.0
---

# domain-driven-data-simulation

Simulation data for DDD apps must feel like a real business domain, not random names. Use a **seeded domain template library** — pick from 6–8 archetypes (e-commerce, banking, logistics, healthcare, SaaS billing, ride-sharing, publishing, insurance) each defined as a JSON template with 3–7 bounded contexts, 2–5 aggregates per context, and 4–10 domain events per aggregate. Name events in past tense (`OrderPlaced`, `PaymentAuthorized`, `ShipmentDispatched`) and commands in imperative (`PlaceOrder`, `AuthorizePayment`) — mixing tenses is the #1 tell that data is fake.

Generate **causal event chains** rather than independent events: an `OrderPlaced` should always trigger a downstream `PaymentRequested` within 50–500ms simulated latency, which triggers either `PaymentAuthorized` (85%) or `PaymentDeclined` (15%). Encode these probabilities in a transition table per aggregate so event-storm and aggregate-flow views show realistic branching. Seed with a deterministic RNG (seedrandom) keyed on the template name so the same archetype always produces the same demo — critical for screenshots, documentation, and reproducible bug reports.

Include **cross-context integration patterns** in the generator: ~30% of events should be consumed by a policy in a different context (triggering an Anti-Corruption Layer translation), and mark 1–2 contexts as Conformist/Customer-Supplier so the context-map relation types are visually populated. Without deliberate cross-context traffic, the explorer view looks like disconnected islands and the demo loses its DDD message.
