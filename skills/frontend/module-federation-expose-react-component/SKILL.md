---
name: module-federation-expose-react-component
description: Expose a React component from one MF remote to be consumed by other remotes via a stable 6-step pipeline (implementation → expose wrapper → config → MF constant → RemoteApp wrapper → consumer import).
category: frontend
tags: [module-federation, micro-frontend, react, webpack, expose, monorepo]
triggers: ["expose a component across module federation remotes", "share React component between MFA remotes", "MFA expose pipeline", "cross-remote import forbidden"]
source_project: lucida-ui
version: 1.0.0
---

# Expose a React component across Module Federation remotes

Use when a component lives in remote A but must render inside remote B (or host), and direct cross-remote import is forbidden (webpack alias collisions, build isolation).

## Steps

1. **Implement in source remote only.**
   - Path: `remotes/<producer>/src/layout/<Component>.tsx`
   - Rule: use `@<shared-scope>/shared/...` imports only. Do not import from sibling remotes.

2. **Create an expose wrapper that isolates Router + stylesheets.**
   - Path: `remotes/<producer>/src/remote-components/exposes/<Component>.tsx`
   - Wrap the component in `MemoryRouter` (not `BrowserRouter`, not `withRouterWrapper` — see skill: `frontend/mfa-memoryrouter-isolation`).
   - Import the producer's own global stylesheets here so the component renders self-contained.

3. **Register in the producer's `modulefederation.config.js`.**
   ```js
   exposes: { './<Component>': './src/remote-components/exposes/<Component>.tsx' }
   ```

4. **Declare an MF constant in the shared types file.**
   - Path: `shared/types/remoteAppProps.d.ts`
   - `export const <SCOPE>_MF_<PRODUCER>_<COMPONENT> = '<Component>'`

5. **Create a consumer-facing RemoteApp wrapper in `shared/`.**
   - Path: `shared/remote-components/imports/<producer>/<Component>.tsx`
   - Wrap with the project's `RemoteApp` loader, passing `[<PRODUCER_MF_NAME>, <COMPONENT_CONST>]`.

6. **Consume from any other remote.**
   ```ts
   import <Component> from '<scope>/shared/remote-components/imports/<producer>/<Component>'
   ```

## Checklist

- [ ] Producer imports only from `shared/` (no cross-remote `@/`).
- [ ] Expose wrapper uses `MemoryRouter`.
- [ ] Expose wrapper imports producer's styles.
- [ ] `modulefederation.config.js` exposes updated.
- [ ] MF name constant added to `shared/types`.
- [ ] `RemoteApp` wrapper added under `shared/remote-components/imports/<producer>/`.
- [ ] Consumer uses the shared wrapper, never the producer path directly.

## Why this shape

- `shared/` is the only safe cross-cutting surface; producer and consumer remotes have different webpack aliases for `@/`.
- Wrapping the expose with `MemoryRouter` avoids Router context loss when the consumer is served from a different dev-server origin (see linked skill).
- The dedicated `RemoteApp` wrapper gives consumers a normal ESM import experience and hides federation loading.

## Related skills

- `frontend/mfa-memoryrouter-isolation` — deep-dive on why `MemoryRouter` is the right choice at the expose boundary.
- `frontend/mfa-plain-html-dropdown-escape-hatch` — common follow-up fix when a DS Dropdown inside the exposed subtree infinite-loops.

See `content.md` for minimal code templates.
