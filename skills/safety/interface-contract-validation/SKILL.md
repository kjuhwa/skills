---
name: interface-contract-validation
description: Define and validate interface contracts for wrapper compatibility before breaking changes
category: safety
version: 1.0.0
version_origin: extracted
confidence: high
tags: [evolver, safety, contracts, api-compat]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - scripts/check_wrapper_compat.js
imported_at: 2026-04-18T00:00:00Z
---

# Declarative interface-contract check

Maintain an `INTERFACE_CONTRACT` array listing `{ file, exports: [...], description }` for each module that external wrappers depend on. A CI script `require`s each file and asserts each named export exists and is a function (or matches a typeof check).

## Why

Catches accidental export removals or renames that break consumers. Cheaper than a full type system, stronger than trusting commit review.

## Mechanism

```js
const CONTRACT = [
  { file: './src/gep/solidify.js',
    exports: ['solidify', 'solidifyCandidate'],
    description: 'Solidify workflow entry points' },
  // ...
];

for (const c of CONTRACT) {
  const mod = require(c.file);
  for (const fn of c.exports) {
    if (typeof mod[fn] !== 'function') fail(`${c.file}: missing ${fn}`);
  }
}
```

## When to reuse

Plugin systems, monorepos with external consumers, or any module surface you promise to keep stable.
