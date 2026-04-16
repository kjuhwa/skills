---
name: mfa-portal-css-isolation
description: Isolate Tailwind CSS in Module Federation portals using lazyStyleTag injection, scoped root elements, and Headless UI PortalGroup
category: design
trigger: When adding Tailwind CSS to a Module Federation remote that must not pollute host or sibling remotes, or when overlay components (Dialog, Tooltip, Popover) render outside the scoped root
version: 1.0.0
source_project: lucida-ui
linked_knowledge:
  - tailwind-mfa-css-isolation-pitfalls
---

# MFA Portal CSS Isolation

## Problem
Tailwind's preflight resets (`*`, `html`, `body`) and global styles leak across Module Federation boundaries, breaking sibling remotes. Portal-based overlays (Dialog, Tooltip) render outside the scoped container, losing Tailwind styles entirely.

## Steps

1. **Remove Tailwind preflight** from the remote's CSS entry:
   - Strip `@layer base` / preflight directives
   - Remove `important: true` from Tailwind config

2. **Use lazyStyleTag for CSS injection**:
   - Configure webpack/style-loader with `injectType: 'lazyStyleTag'`
   - Export styles object: `import portalStyles from './styles/index.css'`
   - Mount: `portalStyles.use()` in component mount
   - Unmount: `portalStyles.unuse()` in component cleanup
   - This ensures CSS is only active while the remote is rendered

3. **Create scoped portal root** (NdsPortalProvider pattern):
   - In `useLayoutEffect`, create `#nds-portal-root` div on `document.body`
   - Apply scope classes: `nds-root nds-theme`
   - Use Headless UI `<PortalGroup target={portalRef}>` to redirect all portals
   - Sync `data-theme` attribute via `useEffect` watching theme state

4. **Wrap all overlay consumers**:
   - Every Dialog, Tooltip, Menu, Popover must render inside the PortalGroup target
   - Never nest PortalProviders — one per remote boundary

5. **postcss-prefix-selector** (optional):
   - Prefix all Tailwind utility classes with `.nds-root` scope selector
   - Prevents any leakage even without lazyStyleTag

## Pitfalls
- `useEffect` vs `useLayoutEffect` timing matters — portal root must exist before first render
- `overflow: hidden` on main container clips portals rendered as children — portal root on `body` avoids this
- ag-grid injects its own global CSS (`.ag-*` namespace) — use styled-components or SCSS overrides per remote
