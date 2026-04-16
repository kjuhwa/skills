---
name: finite-state-machine-data-simulation
description: Canonical FSM data models, transition lookup strategies, and step-through simulation loops for accept/reject testing.
category: workflow
triggers:
  - finite state machine data simulation
tags:
  - auto-loop
version: 1.0.0
---

# finite-state-machine-data-simulation

Three distinct data representations emerged across the apps, each optimized for a different use case. The **map-of-maps** format (`{ event: { fromState: toState } }`) used in the visual-simulator gives O(1) transition lookup via `machine.transitions[event][currentState]` and is ideal for event-driven simulation where the user fires named events. The **edge-list** format (`[{ from, to, on }]`) used in the regex-tester is better for graph rendering (iterate edges directly) and for character-by-character input processing via `transitions.find(t => t.from === current && t.on === char)`. The **implicit** format in the state-designer stores the same edge-list but builds it interactively. When converting between formats, always preserve self-transitions (same `from`/`to`) as they model Kleene-star/plus repetition and are the first thing lost in naive serialization.

The step-through simulation pattern works identically across apps: maintain `currentState` and `stepIdx`, consume one input symbol per step, look up the matching transition, advance state or declare rejection if no transition exists. The regex-tester's `runAll()` wraps this in a `setInterval(step, 400ms)` loop that clears itself when `stepIdx >= input.length`, then checks `accept.includes(currentState)` for the final verdict. This interval-based animation is the reusable core—seed it with any FSM definition and input string. For event-driven machines (traffic light, vending), replace the linear input tape with a button panel dynamically generated from `machine.events`, where each button calls `fire(eventName)` to attempt the transition and log the result.

To generate test data for FSM simulations, define machines as JSON with `{ states[], initial, transitions, events[] }` for event-driven or `{ states[], accept[], transitions[] }` for recognizer-type FSMs. Seed with domain-specific examples: traffic lights (4 states, timer/emergency events), door locks (4 states, 5 events with alarm timeout), vending machines (4 states with error/jam recovery), or regex automata (3–4 states with character-level transitions). Each seed machine should include at least one unreachable-from-some-states event to exercise the "invalid transition" path in the UI.
