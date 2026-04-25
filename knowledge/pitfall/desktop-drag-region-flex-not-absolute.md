---
version: 0.1.0-draft
name: desktop-drag-region-flex-not-absolute
summary: Electron macOS drag strips must be real flex children at the top of the window, not absolute-positioned overlays with z-index — the webkit-app-region hit test is unreliable with stacking contexts.
category: pitfall
tags: [electron, macos, window-move, css, drag-region]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

Every full-window desktop view (login, overlay, any page that covers the native title bar) needs a top drag strip so users can move the window. On macOS the traffic-light buttons are typically hidden via `useImmersiveMode` in overlay-style contexts, so the drag strip also gives back the corner for pointer-drag.

Pattern: flex child at top, not absolute overlay.

```tsx
<div className="fixed inset-0 z-50 flex flex-col bg-background">
  <div className="h-12 shrink-0" style={{ WebkitAppRegion: "drag" }} />
  <div className="flex-1 overflow-auto" style={{ WebkitAppRegion: "no-drag" }}>
    {/* page content — interactive elements need their own "no-drag" */}
  </div>
</div>
```

## Why

Absolute-strip + z-index relies on stacking-context hit-testing, which isn't reliable for `-webkit-app-region`. A real flex row with no siblings at that pixel is unambiguous. Fixed height 48px (`h-12`) matches `MainTopBar` for consistency.

Interactive children inside the page content need explicit `WebkitAppRegion: "no-drag"` or mouse-down gets swallowed by the drag handler and the button/link doesn't fire.

## Evidence

- CLAUDE.md, "Desktop-specific Rules" → "Drag region" section.
- `apps/desktop/src/renderer/src/components/window-overlay.tsx` and `pages/login.tsx` as canonical examples.
