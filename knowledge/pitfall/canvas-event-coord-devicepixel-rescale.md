---
version: 0.1.0-draft
name: canvas-event-coord-devicepixel-rescale
description: Pointer coords on a responsive canvas must be rescaled by `canvas.width / rect.width` — using raw `clientX - rect.left` mis-hits whenever CSS size differs from the backing store size.
category: pitfall
tags:
  - canvas
  - auto-loop
---

# canvas-event-coord-devicepixel-rescale

`17-inkwell-whale-atlas/app.js` click handler: `const r=cv.getBoundingClientRect(); const x=(e.clientX-r.left)*(W/r.width), y=(e.clientY-r.top)*(H/r.height);`. The canvas is sized via `cv.width=cv.clientWidth` in `fit()` on resize, so under normal conditions `W===r.width` and the ratio is 1. But the moment the canvas is scaled by CSS (`width:100%` inside a flex container), zoomed, or initialized before `fit()` runs, the backing-store dimensions diverge from layout dimensions and raw client coords land in the wrong cell.

The `W/r.width` / `H/r.height` multipliers are the fix: they convert CSS-pixel deltas from `getBoundingClientRect` into canvas-internal pixel coordinates that match what `drawImage`/`arc`/`fillRect` consumed. This matters doubly on HiDPI displays if you ever set `canvas.width = clientWidth * devicePixelRatio` to sharpen rendering — the ratio fix is the same formula and Just Works.

Whenever you see `e.clientX - rect.left` used as a canvas coord without the rescale, assume it's a latent bug that will surface the first time someone adds CSS scaling or DPR-aware resizing. Always rescale — the two multiplications are free and the code stays correct under any layout change.
