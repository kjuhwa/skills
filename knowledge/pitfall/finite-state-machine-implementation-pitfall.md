---
name: finite-state-machine-implementation-pitfall
description: Common FSM implementation traps: inconsistent transition formats, lost self-loops, missing dead-state handling, and designer mode leaks.
category: pitfall
tags:
  - finite
  - auto-loop
---

# finite-state-machine-implementation-pitfall

The most frequent pitfall is **transition format inconsistency**. The visual-simulator uses `{ event: { state: nextState } }` while the regex-tester uses `[{ from, to, on }]`—mixing these in the same codebase causes silent failures where lookups return `undefined` instead of throwing. The regex-tester's `a(b|c)d` pattern demonstrates this directly: the initial definition declares `accept: ['S2']` and `states` without `S3`, then patches both with `acceptOverride` and `extra` fields after the fact (lines 3, 7–8 in regex-tester app.js). This post-hoc patching is fragile; if the patch runs out of order or is skipped, the FSM silently accepts at the wrong state. Always define the complete state set and accept set in a single declaration.

**Self-loop rendering failure** is the second major trap. Both Canvas apps (visual-simulator, state-designer) skip self-transitions in arrow drawing (`if (fi === ti) return`), meaning Kleene-star behavior is invisible to the user. Only the SVG-based regex-tester handles self-loops with a bezier curve. If your FSM includes `*` or `+` operators that produce self-transitions, you must explicitly render them or users will not understand why the machine stays in the same state. The fix is a cubic bezier arc above the node: `M(x-15, y-28) C(x-40, y-75) (x+40, y-75) (x+15, y-28)`.

**Mode-state leakage** in interactive designers is a subtle bug: the state-designer maintains a `mode` variable (`idle`, `place-state`, `trans-from`, `trans-to`) plus a `simMode` boolean, creating a hidden 8-combination state space. If the user clicks "Simulate" while in `trans-from` mode, both `simMode=true` and `mode='trans-from'` can be active simultaneously, causing the mousedown handler to enter the transition-creation branch instead of the simulation branch. The state-designer works around this by resetting `mode='idle'` whenever `simMode` toggles, but forgetting this reset in any new mode addition creates ghost interactions. The defensive pattern is to make mode and simMode mutually exclusive via a single discriminated union (e.g., `mode: 'design-idle' | 'design-place' | 'design-trans-from' | 'design-trans-to' | 'simulate'`) rather than two independent variables.
