# Shared-Package-Only Cross-Module Imports

## Problem

In a monorepo with N modules (app-a, app-b, …), each module typically defines its own webpack `@/` alias pointing at its own `src/`. Any import from `app-a` that references `app-b` resolves `@/` against the wrong root and breaks — sometimes at build time, sometimes only in the built bundle. Even when paths resolve, sibling-to-sibling imports create a cyclic dependency graph that blocks independent deploys and makes Module Federation refactors painful.

## Rule

```
host     →  shared
module-a →  shared          (never → module-b)
module-b →  shared          (never → module-a)
```

Dependencies point inward toward `shared/` only. To share a piece of code or a component, move it to `shared/`. To share a runtime UI surface across modules, expose it via Module Federation and import a wrapper from `shared/remote-components/imports/<module>/<Component>` — the wrapper is still in `shared/`, so the consumer never references the other module directly.

## Enforcement

- Give `shared/` its own alias (e.g. `@shared/*` → `shared/*`) and forbid any import that traverses into `modules/*/src/` from another module.
- Add an ESLint rule (`no-restricted-imports`) listing each module's `src/` path as forbidden from other modules.
- Keep `@/` a **local** alias per module — a bare `@/foo` import resolves only within that module's own `src/`.

## Why not just deep-import the file?

- **Alias collision**: `@/` differs per module. Deep paths work until webpack config changes.
- **Build coupling**: deep imports force both modules to be in the same build; blocks independent deploys and MFA.
- **Refactor hazard**: renaming a module's internal file shouldn't break a sibling. If siblings import, they share the blast radius.

## Pitfalls

- Letting a "tiny one-off" cross-import slip through "just this once" — it becomes the first domino.
- Putting too much in `shared/`. `shared/` is for cross-cutting primitives, API clients, domain models, and MF wrappers — not feature-specific UI. Feature UI stays in its module and crosses the boundary only through MF expose.
- Using relative `../../other-module/...` paths instead of aliases and assuming that means it isn't a cross-module import. It still is.
- Forgetting that remote-component wrappers (MF consumers) should live in `shared/`, not duplicated in every consumer module.
