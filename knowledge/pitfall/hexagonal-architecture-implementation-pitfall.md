---
version: 0.1.0-draft
name: hexagonal-architecture-implementation-pitfall
description: Ports become leaky DTO pass-throughs and adapters accumulate domain logic, collapsing the hexagon into layered architecture
category: pitfall
tags:
  - hexagonal
  - auto-loop
---

# hexagonal-architecture-implementation-pitfall

The most common failure mode across all three apps is port interfaces that mirror adapter shapes instead of domain needs. When `UserRepository.findByEmail` returns a `UserRow` with database-column names, or `NotificationPort.send` takes a `SlackMessage` struct, the port is not actually inverting the dependency — it's just a thin forwarder, and the domain ends up coupled to the adapter's vocabulary. Symptom: renaming a DB column forces a domain change. The fix is to make ports speak domain language (`findActiveSubscriber(Email)`, `notifySubscriber(Subscriber, Event)`) and push translation into the adapter implementation.

The second pitfall, visible in hexagonal-dependency-inverter simulations, is adapters that reach back into domain internals — e.g. an HTTP adapter that constructs a domain entity directly instead of calling a use case, or a persistence adapter that applies business rules before saving. This inverts the inversion: the adapter becomes the orchestrator and the "domain" degrades to a data bag. Detect by grepping adapters for domain-rule keywords (`validate`, `calculate`, `authorize`) — they should only appear in the core. For hexagonal-request-tracer, a related trap is spreading trace/correlation-ID logic into the domain; keep it in a cross-cutting adapter decorator so the core remains I/O-agnostic.

Third, teams often create one port per adapter (`PostgresUserPort`, `RedisUserPort`) instead of one port per domain capability with multiple adapter implementations. This multiplies interfaces, defeats substitutability, and is a strong signal the team is building layered architecture with hex vocabulary rather than actual hexagonal architecture.
