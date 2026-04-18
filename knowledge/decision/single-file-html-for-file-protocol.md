---
version: 0.1.0-draft
name: single-file-html-for-file-protocol
description: Generate single-file HTML apps (inline CSS+JS) to avoid CORS errors when opened via file:// protocol
category: decision
source:
  kind: session
  ref: "session-20260418-0000"
confidence: medium
linked_skills:
  - zero-dep-dark-html-app
  - hub-make-parallel-build
tags:
  - html
  - cors
  - file-protocol
  - single-file
---

**Fact:** Browser-based apps generated as multi-file (index.html + app.js + style.css) fail with CORS errors when opened via `file://` protocol. Single-file HTML with inline `<style>` and `<script>` avoids this entirely.

**Why:** `file://` URLs are treated as unique security origins. Loading external `.js` files via `<script src="app.js">` triggers cross-origin blocking. Babel standalone's `<script type="text/babel" src="app.js">` also fetches the file, hitting the same CORS wall.

**How to apply:** When generating browser apps intended for local use (no server): embed ALL CSS in `<style>` tags and ALL JS/JSX in `<script>` tags within the single `index.html`. CDN `<script src="https://...">` imports are fine — only local file references break.

**Evidence:** `38-wal-tombstone-atlas` generated with separate `app.js` containing JSX. CORS error on `file://` open. Fixed by requiring single-file output in the generation prompt.
