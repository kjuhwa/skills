---
name: hexagonal-architecture-implementation-pitfall
description: Common structural and dependency-direction mistakes when implementing hexagonal architecture in interactive applications.
category: pitfall
tags:
  - hexagonal
  - auto-loop
---

# hexagonal-architecture-implementation-pitfall

The most dangerous pitfall in hexagonal architecture implementations is **violating the dependency rule through port-adapter coupling**. In the visualizer app, ports are stored with rendering metadata (angle, pixel position) baked directly into the domain model — `{ name: 'HTTP In', angle: Math.PI, type: 'driving' }` mixes domain identity with presentation concerns. When adapters reference ports by array index (`adapters.find(a => a.port === i)`), removing or reordering a port silently breaks all adapter links. In production systems this manifests as service wiring that depends on registration order rather than explicit port interfaces, making the architecture brittle to refactoring. The fix is to give ports stable identifiers and have adapters reference those IDs, not positional indices.

A second pitfall is **symmetric treatment of driving and driven sides**, which obscures the fundamental asymmetry of hexagonal architecture. The builder app assigns both port types the same color (#6ee7b7) and allows them to be stacked in any order, including nonsensical arrangements like driven-adapter → entity → driving-port. Real hexagonal architecture enforces a strict onion ordering: driving adapters call driving ports, which delegate to use-cases, which invoke driven ports, which are implemented by driven adapters. Without layer-ordering validation, the tool teaches incorrect mental models. The flow simulator partially addresses this by hard-coding the traversal order in its scenario schema, but even there, nothing prevents defining a scenario where a driven adapter appears before the domain core.

A third pitfall is **conflating flow simulation with dependency visualization**. The animated particles in the visualizer move bidirectionally (driving → core, then core → driven), which correctly represents runtime data flow but incorrectly implies the domain *depends on* driven adapters. In hexagonal architecture, the domain defines driven port *interfaces* — the adapter implements them, so the compile-time dependency arrow points inward. Showing only runtime flow without indicating dependency direction misleads developers into thinking the domain "calls out" to infrastructure. Effective tooling must distinguish between the direction data flows at runtime (outward to adapters) and the direction dependencies point at compile time (always inward toward the domain).
