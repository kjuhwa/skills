---
name: mf-shared-singleton-config
description: 227 shared dependencies configured as Webpack Module Federation singletons with strict versioning; react-router-dom intentionally excluded
category: arch
source:
  kind: project
  ref: lucida-ui@4b922a9043
---

# Module Federation Shared Singleton Configuration

## Fact

`mf-shared.config.js` configures 227 npm packages as Module Federation shared singletons with `strictVersion: true`. This ensures all 25 remotes + 1 host load exactly one copy of each library. Notably, `react-router-dom` is **not** shared — each remote manages its own router context.

## Evidence

- `mf-shared.config.js`: 227 entries, all with `singleton: true`
- Critical singletons: `react@18.3.1`, `react-dom@18.3.1`, `recoil@0.7.7`, `antd@5.28.0`, `echarts@5.4.0`, `ag-grid-react@33.2.1`
- `react-router-dom` absent from shared config
- `withRouterWrapper` HOC exists specifically because router context is per-remote

## Why react-router-dom Is Excluded

1. **Router isolation** — each remote needs its own `BrowserRouter` or `MemoryRouter` to avoid route collisions
2. **MFA expose pattern** — `withRouterWrapper` detects if a router context exists and wraps only when needed
3. **Independent navigation** — remotes can define their own route trees without conflicting with the host

## Why Strict Versioning

- **Runtime crashes** — version mismatches in React (e.g., two React instances) cause hooks to break silently
- **Bundle size** — without singleton, each remote bundles its own copy of antd (1MB+), echarts, etc.
- **State sharing** — Recoil atoms only work if all remotes share the exact same Recoil instance
