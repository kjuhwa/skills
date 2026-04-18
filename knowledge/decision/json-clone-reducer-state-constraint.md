---
version: 0.1.0-draft
name: json-clone-reducer-state-constraint
description: `JSON.parse(JSON.stringify(state))` is sufficient for pure-reducer immutability only when state is JSON-safe — it silently drops `Date`, `Map`, `Set`, `RegExp`, functions, and `undefined`.
category: decision
tags:
  - canvas
  - auto-loop
---

# json-clone-reducer-state-constraint

`18-velvet-cartographers-voyage/app.js` uses `const n = JSON.parse(JSON.stringify(s))` inside `step()` to get a cheap deep clone before mutating. This works because the state shape is deliberately plain: numbers, strings, arrays, and nested plain objects (`ship:{q,y}`, `cells:[{q,y,t,star,charted}]`). No `Date`, no `Map`, no class instances. The seeded RNG is reconstructed per call from `n.seed + n.turn*7919`, not stored as a closure — which is what makes the JSON-clone-safe decision possible.

The lesson is that this idiom is a **design constraint on state shape**, not just an implementation detail. Once you want a timestamp field, you either store `Date.now()` as a number (fine) or a `Date` object (broken after clone, silently becomes a string). Same for de-duped sets (use arrays + `includes`, not `Set`). This is the right tradeoff for small games/simulations where you want zero dependencies and pure-reducer semantics, but it rots the moment someone adds a richer type without noticing.

If state grows complex, switch to `structuredClone(s)` (handles Map/Set/Date/typed arrays, still no functions) before reaching for Immer. Document the "state must be JSON-safe" invariant at the top of the reducer file so future contributors don't quietly poison it.
