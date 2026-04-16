---
name: finite-state-machine-implementation-pitfall
description: Common FSM bugs including silent transition failures, timer race conditions, invisible sink states, and emergency-state context loss.
category: pitfall
tags:
  - finite
  - auto-loop
---

# finite-state-machine-implementation-pitfall

The most insidious FSM bug is the **silent invalid transition**. When `transitions.find(t => t.from === current && t.event === e)` returns `undefined`, a bare `if (!tr) return` swallows the error with no feedback. In production this means the UI freezes on a state with no explanation. The fix is to always emit a visible "no valid transition" indicator—flash the current state red, append a log entry, or throw—so that missing edges in the transition table surface immediately during testing rather than hiding as "the button didn't work."

**Timer race conditions** plague any FSM that uses `setInterval`. The regex-tester clears its timer at the start of `run()`, but if the user clicks Run twice rapidly, the `clearInterval` races against a callback already queued on the event loop, producing two concurrent tickers that decrement the same countdown at double speed. The traffic-light variant is worse: pressing the emergency button during a tick can spawn a second `setInterval` if the button handler doesn't gate on a `running` flag. The defensive pattern is a single `tickerId` variable, always cleared before re-assignment, combined with a boolean `isRunning` guard that the tick callback checks before mutating state.

**Invisible sink states** create a semantic gap between logic and UI. The regex-tester defines REJECT implicitly (`state = next || 'REJECT'`) but filters it out of the SVG rendering, so a rejected string shows no visual state—the machine simply stops with no node highlighted. Meanwhile the traffic-light's EMERGENCY state stores `next: null`; if emergency is triggered from within emergency, `preEmergency` captures `null`, and on expiry the FSM falls back to a hardcoded default (`NS_GREEN`), jumping to an arbitrary point in the cycle. Both bugs stem from the same root: FSM states that exist in the transition logic but lack first-class representation in the state map or UI. Every state reachable by any code path—including error sinks, interrupt modes, and default fallbacks—must appear in the state definition object with explicit metadata, even if the visualization deliberately hides it.
