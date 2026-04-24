# typescript-dual-export-cjs-mjs — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `js/package.json:7-17`
- `js/tsconfig.json:1-30`

## When this pattern is a fit

Publishing a TS library that must work in legacy CJS Node, modern ESM Node, and bundlers (webpack/vite).

## When to walk away

- Dual builds roughly double compile time; use tsc --build for incremental.
- Source maps need separate handling for each output; tools must pick the right one.
- Circular imports behave differently in CJS vs ESM; design to avoid them.
- Tree-shaking works well with ESM but bundlers may struggle with CJS — document for users.
