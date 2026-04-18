---

name: finite-state-machine-data-simulation
description: Drive FSM demos with a deterministic event queue plus auto-play timer so users can step, reset, and replay transitions reproducibly.
category: workflow
triggers:
  - finite state machine data simulation
tags: [workflow, finite, state, machine, data, simulation]
version: 1.0.0
---

# finite-state-machine-data-simulation

FSM demo apps need a simulation harness separate from the FSM definition itself. Structure it as three pieces: (1) a pure `transition(state, event) → nextState` reducer that encodes the transition table with no side effects, (2) an event queue / history log that records `{tick, fromState, event, toState, guardResult}` for every step, and (3) a controller with `step()`, `reset()`, `autoPlay(intervalMs)`, and `loadScenario(events[])` methods. The reducer must be pure so reset truly replays — any timer-driven auto-transitions (traffic-light green→yellow after 5s, vending-machine dispense→idle after 2s) belong in the controller, not the reducer, and are queued as synthetic events like `{type: 'TIMER_EXPIRED', source: 'GREEN'}`.

Seed deterministic scenarios for each demo type: traffic-light needs a pedestrian-button-press scenario and a power-failure-to-blinking-red scenario; vending-machine needs insufficient-funds, exact-change, change-due, and sold-out scenarios; regex-fsm needs matching/non-matching/partial-match input strings. Store scenarios as arrays of events and expose them via a dropdown so users compare behaviors without manual clicking. Guards (vending-machine's `hasEnoughMoney`, regex's `charMatchesClass`) should be pure predicates called by the reducer — surface guard-rejection in the history log as `{event, rejected: true, reason}` so users see why an event didn't transition.

For auto-play, drive transitions from a single `setInterval` in the controller and pause/resume on visibility change (document.hidden) to avoid drift when the tab is backgrounded. Rate-limit user-driven `step()` to match one animation frame (~400ms) so rapid clicks don't skip animations; queue excess clicks rather than dropping them so the history stays complete. Always expose a "jump to tick N" scrubber backed by the event log — users learn FSMs by rewinding mistakes.
