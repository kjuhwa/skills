---
version: 0.1.0-draft
name: finite-state-machine-implementation-pitfall
description: Common FSM bugs: undefined-transition silent no-ops, guard side effects, and async timer drift during state changes.
category: pitfall
tags:
  - finite
  - auto-loop
---

# finite-state-machine-implementation-pitfall

The most common FSM bug is treating undefined `(state, event)` pairs as silent no-ops. When a vending-machine in `DISPENSING` state receives another `COIN_INSERTED`, or a traffic-light in `RED` gets `TIMER_EXPIRED` meant for `GREEN`, the reducer often returns the current state unchanged with no log entry — hiding real bugs like stuck timers firing for the wrong state. Always make the reducer return an explicit `{nextState, handled: boolean}` and log unhandled events at warn level. For regex-FSM visualizers specifically, undefined transitions on a character mean "reject" — conflating that with "stay in state" breaks the accept/reject verdict.

Guard functions must be pure. A surprisingly common mistake is putting `vendingMachine.balance -= price` inside `canDispense()` — the guard then mutates state during evaluation, and if the transition is rejected by a later guard or the UI re-renders mid-evaluation, balance corrupts. Keep guards as `(state, event) → boolean`; all state mutations belong in the reducer's return value. Similarly, don't emit side effects (play sound, fetch API) from inside the reducer — return an `effects: []` list and have the controller execute them after commit, so time-travel debugging and replay still work.

Timer-driven transitions drift when the tab is backgrounded or when state changes happen faster than the animation. If traffic-light is mid-transition GREEN→YELLOW (400ms animation) and a pedestrian button forces YELLOW→RED, a naive setTimeout still fires the original GREEN→YELLOW completion, landing the machine in the wrong state. Cancel pending timers on every transition (`clearTimeout(state.pendingTimer)` in the reducer's exit action) and store timer IDs in state, not in closures. For auto-play loops, use `requestAnimationFrame` or a single ticking interval rather than per-state setTimeouts — one source of truth for time prevents compounding drift across long scenarios.
