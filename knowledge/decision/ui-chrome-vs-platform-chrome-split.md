---
version: 0.1.0-draft
name: ui-chrome-vs-platform-chrome-split
summary: UX affordances live in shared views (web + desktop render identical content); platform chrome (drag strip, immersive mode, tab system) lives in desktop-only code. Violating this split always produces platform divergence.
category: decision
tags: [cross-platform, ui-architecture, electron, nextjs]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

UX affordances (Back button, Log out button, welcome copy, invite card) belong in the shared views package so web and desktop render identical content. Platform chrome (drag strip, `useImmersiveMode`, tab system interaction, traffic-light accommodation) lives in desktop-only code.

If a button exists on desktop but not on web for the same flow, that's a signal UX escaped into platform code. Either move the button to the shared view, or admit that the flow is legitimately platform-specific.

## Why

When a shared view is platform-unaware, bug fixes land once and both platforms inherit them. When platform-specific chrome is kept cleanly out of shared views, the shared views are reusable in new platforms (mobile? CLI? new platform tier?) without a big untangling.

Practical split mechanism: shared layout components expose platform slots (`extra`, `topSlot`, `bottomSlot`) that each app fills with its own chrome. The shared layout doesn't know or care what goes in the slot.

## Evidence

- CLAUDE.md, "Desktop-specific Rules" → "UX vs platform chrome" section.
- `packages/views/layout/` slots consumed differently by web and desktop.
