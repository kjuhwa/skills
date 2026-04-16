---
name: bulkhead-visualization-pattern
description: Visual metaphor pattern for rendering isolated resource partitions with fault-state indicators and per-compartment health.
category: design
triggers:
  - bulkhead visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# bulkhead-visualization-pattern

The bulkhead visualization pattern uses two complementary metaphors to make isolation tangible: a **physical ship hull** divided into labeled compartments (Bow, Cargo, Engine, Stern) where water-fill level animates breach severity, and a **software partition grid** where each service gets a fixed set of slot indicators colored by state (idle, active, error). Both representations share the same structural rule — every partition is a visually bounded rectangle with an explicit wall separator (the green bulkhead line at 4px width in the ship canvas, the card border in the partition grid). The partition must always display its label, its current fill level as a percentage, and a binary breach/fault badge. This three-layer encoding (boundary + fill + badge) lets the viewer instantly distinguish "which compartment is affected" from "how badly" from "is it contained."

The color system follows a three-tier severity ramp: green (#6ee7b7) for healthy/sealed, amber (#fbbf24) for elevated utilization (60-85%), and red (#f87171) for breached/faulted/saturated. In the ship metaphor, water uses a blue gradient (#3b82f6) that fills bottom-up via a linear gradient, giving directional weight to the danger. In the software metaphor, individual slot cells toggle between active (green) and error (red) states. The status bar summarizes the global picture — "All compartments sealed" vs. "N breached — bulkheads holding M dry" — framing isolation as the success metric rather than zero-failure. This framing is critical: the bulkhead pattern does not prevent failure, it *contains* failure, and the visualization must celebrate containment as a positive outcome.

The reusable structure is: a horizontal array of equal-height containers separated by visually prominent walls, each container independently animated to show its own fill/utilization, with a global status line that counts sealed vs. breached. Any domain with isolated partitions (thread pools, connection pools, rate-limit buckets, Kubernetes resource quotas) can instantiate this template by mapping its resource to the compartment, its utilization to the fill level, and its failure threshold to the breach badge.
