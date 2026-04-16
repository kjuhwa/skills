---
name: drawer-over-modal
description: Decision to use side drawers (463 files) instead of centered modals (10 usages) as the primary overlay pattern
category: decision
source:
  kind: project
  ref: lucida-ui@4b922a9043
---

# Drawer Over Modal

## Fact

Drawers are the dominant overlay pattern with 463 drawer-related files vs ~10 direct `Modal.warn`/`Modal.confirm` usages. The base `Drawer` component provides preset width tiers (`1dp`–`7dp`), resizable handles, and standardized footer actions.

## Evidence

- `shared/components/commons/drawer/Drawer.tsx`: base component with `TypeDrawerWidth` presets
- `shared/components/commons/drawer/DrawerActions.tsx`: standardized footer (Save/Close)
- 463 files matching `*Drawer*` or `*drawer*` across shared/ and remotes/
- Direct `Modal.warn()` only in `PrivateRoute.tsx` (session expiry) and a few confirmation dialogs
- Every domain (alarm, apm, dpm, widget, config) uses drawer for detail views

## Why This Choice

1. **Context preservation** — drawer slides in from the side, keeping the parent list/grid visible for reference
2. **Data density** — monitoring UIs show dense grids; drawers provide detail without losing the overview
3. **Consistent UX** — preset widths (`1dp`=24rem to `7dp`=full) give designers a vocabulary
4. **Nested drawers** — drawers can stack (e.g., list → detail drawer → sub-detail drawer) more naturally than nested modals
