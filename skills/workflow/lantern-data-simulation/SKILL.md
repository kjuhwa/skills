---
name: lantern-data-simulation
description: Generating plausible synthetic lantern fleet state (position, fuel, wick health, release events) for demo and test scenarios
category: workflow
triggers:
  - lantern data simulation
tags:
  - auto-loop
version: 1.0.0
---

# lantern-data-simulation

Lantern apps need believable fleet data without a live backend. Model each lantern as `{id, releasedAt, position:{x,y,z}, velocity, fuelRemaining:0..1, wickIntegrity:0..1, flameColor:'amber'|'crimson'|'jade', originStory}`. Seed a deterministic PRNG (mulberry32 keyed off a session string like `"lantern-atlas-2026"`) so demos reproduce across reloads. Generate release events as a Poisson process with λ scaled to the scene — constellation-atlas wants ~200 lanterns total with λ≈0.3/s during a 10-minute festival window, drifting-ember-flight wants sparse ~12 lanterns with λ≈0.05/s, and whispering-wick-composer wants bursts of 3–8 lanterns on user interaction.

Fuel and wick decay on independent curves: fuel follows linear decrement (0.1%/s baseline, 0.4%/s under high wind), wick follows an accelerating sigmoid that only meaningfully degrades in the last 20% of lantern lifetime. A lantern extinguishes when `min(fuel, wick) < 0.02`, at which point transition to a 3-second fade-out phase emitting a final smoke-puff particle burst rather than disappearing instantly. Origin stories should be pulled from a small templated pool (`"released by {name} for {occasion}"`) with ~30 name fragments and ~15 occasion fragments — enough variety to feel populated, small enough to ship in the bundle.

For test scenarios, expose a `scrubToTime(seconds)` helper that replays the deterministic event stream up to a target timestamp, rather than stepping the live simulation forward. This makes screenshot tests and regression fixtures trivial and lets the composer variant align audio timeline to visual state.
