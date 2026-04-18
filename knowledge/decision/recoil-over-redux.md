---
version: 0.1.0-draft
tags: [decision, recoil, over, redux]
name: recoil-over-redux
description: Decision to use Recoil atoms (2697 usages, 53 store files) as sole state management instead of Redux in a 25-remote MFA monorepo
category: decision
source:
  kind: project
  ref: lucida-ui@4b922a9043
---

# Recoil Over Redux

## Fact

The project uses Recoil as its sole global state management library — 2,697 Recoil hook usages across 53 store files. No Redux, Zustand, or Jotai present. Context API is used only for cross-cutting concerns (theme, language, loading, grid config) — not for domain state.

## Evidence

- `shared/store/atom/global/`: 18 global atoms (user, date, filter, grid, modal, menu, etc.)
- `shared/store/atom/remote/`: 15+ domain-scoped atom modules (apm, dpm, alarm, widget, etc.)
- `shared/store/hook/`: typed hook wrappers (useTimeSelector, useDashboardFilter)
- `mf-shared.config.js`: Recoil shared as singleton (`requiredVersion: '0.7.7'`)
- No `redux`, `@reduxjs/toolkit`, `zustand`, or `jotai` in dependencies

## Why This Choice

1. **Atom granularity** — each piece of state is independently subscribable; avoids monolithic store
2. **MFA singleton sharing** — Recoil shared via Module Federation singleton means all remotes share the same atom instances
3. **No boilerplate** — no actions/reducers/slices; atoms + selectors + hooks only
4. **Selector composition** — derived state via selectors (e.g., `alarmCollapsedSelector` returns function for parameterized lookup)

## Trade-offs

- **No DevTools** — Recoil lacks mature DevTools compared to Redux DevTools
- **React 18+ deprecation risk** — Recoil's maintenance has slowed; future migration to Jotai may be needed
- **No middleware** — side effects handled in hooks, not in a middleware layer
