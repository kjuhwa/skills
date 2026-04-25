---
version: 0.1.0-draft
name: zustand-selector-stable-references
summary: Zustand selectors must return stable references — returning a freshly built object/array on every call triggers infinite re-renders.
category: pitfall
tags: [zustand, react, selector, infinite-loop, performance]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

A Zustand selector is called on every store update and the returned value is compared with `Object.is`. If the selector builds a new object or array on every call, the comparison always fails and the component re-renders — which runs the selector again, which re-renders, etc. Common forms that trigger this:

```ts
// BAD: new object every call
const { a, b } = useStore(s => ({ a: s.a, b: s.b }));

// BAD: new array every call
const names = useStore(s => s.items.map(i => i.name));
```

## Why

Fix by either selecting primitives separately (one `useStore` per field) or passing a shallow-equality comparator (`useStore(selector, shallow)`). For derived collections, memoize outside the selector or compute in a `useMemo` seeded with a primitive version counter.

Second footgun: hooks that call `useWorkspaceId()` internally cannot run outside a `WorkspaceIdProvider`. Prefer accepting `wsId` as a parameter so the hook works in sidebar chrome that renders before workspace is loaded.

## Evidence

- CLAUDE.md, "Common Zustand footguns to avoid" section.
- Idiom applies to any Zustand 5.x codebase.
