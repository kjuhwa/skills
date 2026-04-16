---
name: hexagonal-architecture-implementation-pitfall
description: Common mistakes when implementing hexagonal architecture visualizations and the underlying port/adapter patterns they represent.
category: pitfall
tags:
  - hexagonal
  - auto-loop
---

# hexagonal-architecture-implementation-pitfall

The most dangerous pitfall visible across these apps is **dependency direction violation masked by convenience**. The Dependency Flow app explicitly models the rule that arrows must point inward (outer ring → inner ring), but in real codebases this rule is trivially broken when an adapter imports are "just one shortcut." The Config/DI module in the simulation demonstrates the correct escape hatch — a composition root at the outermost ring that wires everything together — but developers often skip this and let application services directly instantiate their adapters, collapsing the port abstraction into a leaky implementation coupling. The visualization highlights this by coloring illegal outward dependencies red, but in production code there is no such visual guardrail, making static analysis or ArchUnit-style dependency checks essential.

A second pitfall is **over-layering without clear port contracts**. The Layer Explorer defines four distinct rings (Domain, Application, Adapters, Infrastructure), but in practice teams add layers reflexively — creating "anti-corruption layers," "mapper layers," or "DTO layers" — without defining the port interface that justifies the boundary. Each ring in hexagonal architecture should correspond to a concrete port interface (inbound or outbound) that the inner layer defines and the outer layer implements. If a layer exists without a corresponding port, it's dead weight that adds indirection without decoupling. The apps' data structures enforce this naturally: every adapter node in the Dependency Flow graph references a port node in its `deps`, making orphaned layers impossible in the model.

A third pitfall is **confusing port direction with data flow direction**. The Port & Adapter Simulator shows inbound ports on the left and outbound ports on the right, with animated dots flowing in both directions. This visual can mislead developers into thinking that "inbound port" means "data flows in" and "outbound port" means "data flows out." In reality, port direction refers to **who initiates the call**: inbound ports are interfaces that external actors call into the application (driven side), while outbound ports are interfaces the application calls out to (driving side). A response flowing back through an inbound port is still an inbound port — the direction is about dependency ownership, not data travel. The Simulator's round-robin response routing (`id % 3`) across outbound ports further obscures this by making it look like any inbound request can exit through any outbound port, which conflates routing with architectural boundaries.
