---
name: finite-state-machine-data-simulation
description: Declarative state-transition table driving both simulation logic and UI generation from a single source of truth.
category: workflow
triggers:
  - finite state machine data simulation
tags:
  - auto-loop
version: 1.0.0
---

# finite-state-machine-data-simulation

Each app encodes its FSM as a declarative data structure — a transitions array (fsm-playground: `[{from, to, event}]`), a state map with `next`/`duration` properties (fsm-traffic-sim: `{RED: {next:'GREEN', duration:7}}`), or a nested transition table (fsm-regex-matcher: `{S0: {a: 'S1'}}`). This single structure drives everything: transition firing, available-event filtering, visualization, and history logging. No transition logic is hardcoded in event handlers — they simply look up the next state from the table. This makes the FSM definition the sole source of truth and allows adding states or transitions without touching rendering or UI code.

The simulation workflow diverges by domain. The traffic simulator uses a time-based tick loop (`setInterval` at 100ms) where elapsed time accumulates and triggers transitions when a duration threshold is met — a continuous simulation model with a speed multiplier slider. The playground uses discrete event-driven firing where the user clicks buttons generated dynamically from `getEventsFrom(currentState)`, and disabled buttons visually signal invalid transitions. The regex matcher uses a step-through model where each click advances a read-head one character along an input tape, looking up `trans[currentState][char]` — halting on missing transitions ("stuck") or checking accept-state membership at end-of-input. All three log transition history by prepending `"from → to"` entries to a scrollable div.

To reuse: choose your simulation driver (tick-based, event-driven, or step-through), but always resolve transitions via table lookup (`table[currentState][event]`). Generate UI controls (buttons, step triggers) from the transition table itself so they stay in sync. Keep a `current` state variable as the single mutable atom — everything else derives from it plus the static table.
