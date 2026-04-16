---
name: finite-state-machine-data-simulation
description: Model FSM execution as a step function over a transition table, with current-state tracking, input consumption, and accept-state evaluation.
category: workflow
triggers:
  - finite state machine data simulation
tags:
  - auto-loop
version: 1.0.0
---

# finite-state-machine-data-simulation

The three apps demonstrate two equivalent ways to encode an FSM transition function. The visual simulator uses an array of `{from, to, label}` objects and resolves transitions with `transitions.find(t => t.from === current && t.label === symbol)` — simple and readable for small alphabets. The regex matcher uses a nested delta object `{S0: {a: 'S1', b: 'DEAD'}, ...}` and resolves with `delta[state][symbol]`, which is O(1) lookup and scales better when states have many outgoing edges. The traffic controller takes a third approach: each state config embeds a single `next` field for deterministic time-driven transitions, with no input alphabet at all — the "input" is the timer exceeding a duration threshold.

The core simulation loop is identical across all three: maintain a `current` state variable, consume the next input (symbol or timer tick), look up the transition, update `current`, and re-render. The visual simulator and regex matcher add a `pos` index tracking how far through the input string the machine has advanced, enabling step-by-step replay. The regex matcher also accumulates a `path` array and `edges` array during execution, which the animation system then replays at 500ms intervals. The traffic controller instead maintains a transition log (`log.unshift(from + ' → ' + to)`) capped at 8 entries for a rolling history display.

To reuse this pattern: define your states and transition table (array or nested object), initialize `current` to the start state, and implement a `step(input)` function that resolves the next state and returns whether the machine has reached an accept state. Wrap it with either manual stepping (button-driven), automatic replay (setInterval-driven animation), or continuous simulation (timer-tick-driven). Keep the path/history as a separate concern — push to an array on each step so the UI layer can render traces, logs, or animated playback independently of the FSM engine itself.
