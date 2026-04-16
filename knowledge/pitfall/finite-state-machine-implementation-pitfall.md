---
name: finite-state-machine-implementation-pitfall
description: Common FSM implementation traps including missing transitions, stale UI, and tight coupling of machine definition to rendering.
category: pitfall
tags:
  - finite
  - auto-loop
---

# finite-state-machine-implementation-pitfall

The most dangerous pitfall in FSM implementations is **missing or implicit dead states**. In fsm-regex-matcher, when `trans[currentState][char]` returns `undefined`, the machine enters a "stuck" state that exists nowhere in the state table — it's handled by an ad-hoc `if(!next)` check. If this guard is omitted, `cur` becomes `undefined` and the entire visualization breaks silently: circles disappear, arrows stop highlighting, and no error is thrown because canvas draw calls with `NaN` coordinates simply produce no output. In production FSMs, always define an explicit `DEAD`/`TRAP` state with self-loop transitions on all inputs, or validate that every `(state, input)` pair has a defined target before running.

A second pitfall is **stale UI after state changes**. All three apps must manually call `renderButtons()`, `updateLights()`, `drawTape()`, and `draw()` after every transition. If any call is missed (e.g., adding a new transition path and forgetting to redraw), the visual state desyncs from the machine state. The playground partially mitigates this by always calling `renderButtons(); draw()` together, but there's no framework-level guarantee. A reactive wrapper (e.g., a `setState` function that triggers all subscribers) would eliminate this class of bug. The traffic sim's `setInterval` naturally re-renders every tick, masking the problem — but if `running` is false and a manual state change is added later, the UI won't update.

A third pitfall is **mixing layout coordinates into the machine definition**. All three apps store `{x, y}` positions alongside or inside the transition table. This means changing the FSM topology (adding a state) requires simultaneously choosing pixel coordinates, and the layout doesn't adapt to different screen sizes or state counts. For anything beyond 4-5 states, auto-layout (force-directed or layered graph algorithms) should replace hand-placed coordinates. Additionally, none of the apps validate the transition table for unreachable states or missing transitions at initialization — a simple reachability check from the start state would catch definition errors early.
