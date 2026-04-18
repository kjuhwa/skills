---
version: 0.1.0-draft
tags: [pitfall, tailwind, mfa, css, isolation, pitfalls]
name: tailwind-mfa-css-isolation-pitfalls
category: pitfall
description: CSS isolation failures when using Tailwind CSS in Module Federation — preflight leaks, portal scope loss, postcss-prefix-selector parse errors
source:
  kind: project
  ref: lucida-ui@4b922a9043
---

# Tailwind CSS Isolation Pitfalls in MFA

## Fact
Tailwind CSS in a Module Federation remote causes three categories of isolation failures that must be addressed systematically.

## Evidence

### 1. Preflight global pollution
- **Commit**: `051c96178e` — "Tailwind CSS 전역 오염 격리 (preflight/important 제거 + lazyStyleTag)"
- **Root cause**: Tailwind's `@layer base` (preflight) applies `*`, `html`, `body` resets globally, breaking host and sibling remote styles
- **Fix**: Remove preflight from remote's CSS entry; use `injectType: 'lazyStyleTag'` so CSS is only active while the remote is mounted (`portalStyles.use()` / `.unuse()`)

### 2. Portal scope loss (Dialog/Tooltip/Popover)
- **Commit**: `0e28bdfe4a` — "Dialog 포탈 Tailwind CSS 격리 스코프 누락 수정"
- **Root cause**: Overlays rendered via React Portal land outside the scoped `.nds-root` container, losing all Tailwind utility classes. Additionally, `overflow: hidden` on the main container clips portals that are its descendants.
- **Fix**: Create `#nds-portal-root` on `document.body` with `nds-root nds-theme` classes; redirect all overlays via Headless UI `<PortalGroup target={portalRef}>`
- **Timing**: Must use `useLayoutEffect` (not `useEffect`) so portal root exists before first child render

### 3. postcss-prefix-selector parse failure
- **Commit**: `50515c6f9c` — "postcss-prefix-selector 모듈 해석 실패 수정"
- **Root cause**: Build-time CSS prefix scoping tool failed to parse certain Tailwind output, blocking the isolation pipeline entirely
- **Fix**: Module resolution / import path correction

## Why this matters
MFA CSS isolation is not a one-time setup — each new overlay component type (Dialog, Tooltip, Menu, Popover, Dropdown) must be verified to render inside the scoped portal root. Missing even one creates a silent regression where styles work in dev (single remote) but break in production (multiple remotes loaded).
