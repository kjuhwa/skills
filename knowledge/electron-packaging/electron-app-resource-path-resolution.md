---
version: 0.1.0-draft
name: electron-app-resource-path-resolution
summary: Electron derives `process.resourcesPath` from `/proc/self/exe`; when the binary and app resources live in separate directories (Nix, custom installs), it points at the wrong tree. A preload wrapper that overrides it using `__dirname` corrects this before any app code runs.
category: electron-packaging
tags: [electron, resource-path, preload, wrapper, linux, nix, __dirname]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# Electron App Resource Path Resolution

## Context

Electron apps distribute resources (locale files, tray icons, native modules)
alongside `app.asar`. The app code accesses these via `process.resourcesPath`,
which Electron sets at startup based on the location of the Electron binary.
On standard Windows/macOS installs the binary and resources always live
together, so `process.resourcesPath` is always correct.

On Linux with non-standard layouts — packaging systems that store the Electron
binary in one location and the app in another (common in Nix, FHS environments,
or custom multi-app setups) — the two paths diverge and the built-in value is
wrong.

## Observation

`process.resourcesPath` is set to `<dir-of-electron-binary>/resources/`. On
standard builds the `app.asar` is also placed there, so everything works.
On NixOS (separate `electron-unwrapped` store path from the app derivation) or
any layout where the binary and app are not co-located, `process.resourcesPath`
resolves to Electron's own resources directory, not the app's.

The app code that reads locale JSON and tray icons runs early — before most
app logic — and will `ENOENT`-crash if `process.resourcesPath` is wrong.

However, when the app's `package.json` `main` field is redirected through a
custom entry point loaded from inside `app.asar`, the entry point's `__dirname`
is the root of the `.asar` archive. The parent of `__dirname` is the directory
containing `app.asar`, which is also the correct `resources/` directory —
regardless of where the binary lives.

## Why it happens

Electron uses `electron::GetResourcesPath()` (C++) which resolves
`/proc/self/exe` to find the binary directory. There is no runtime hook to
override this from JavaScript before the main process starts. The only
interception point is in the first JavaScript that runs — the `main` entry
point.

`path.dirname(__dirname)` inside `app.asar` consistently yields the containing
`resources/` directory on all packaging formats (deb, AppImage, Nix) because
`.asar` files are always placed inside a `resources/` directory by Electron
convention.

## Practical implication

Create a wrapper entry point (`frame-fix-entry.js` or similar) that:
1. Computes the expected resources path from `__dirname`.
2. If it differs from `process.resourcesPath`, overwrites the process property.
3. Then `require()`s the original app entry point.

```js
// wrapper-entry.js — injected as package.json "main" by the build script
require('./resource-path-fix');
require('./original-main');

// resource-path-fix.js
const path = require('path');
const derived = path.dirname(__dirname); // dirname of asar root = resources/
if (derived !== process.resourcesPath) {
  console.log('[ResourceFix] Correcting process.resourcesPath');
  console.log('[ResourceFix]   Was:', process.resourcesPath);
  console.log('[ResourceFix]   Now:', derived);
  process.resourcesPath = derived;
}
```

Inject the wrapper by modifying `package.json` inside the `.asar` at build
time (before repacking):

```bash
node -e "
  const fs = require('fs');
  const pkg = require('./app.asar.contents/package.json');
  pkg.originalMain = pkg.main;
  pkg.main = 'wrapper-entry.js';
  fs.writeFileSync('./app.asar.contents/package.json', JSON.stringify(pkg, null, 2));
"
```

This approach is a belt-and-suspenders measure: on deb and AppImage builds
`derived === process.resourcesPath` and the override is a no-op. On Nix and
other split-layout builds it silently corrects the path before app code runs.

## Source reference

- `scripts/frame-fix-wrapper.js`: lines 12-19 — exact implementation with log
  messages showing the correction.
- `CLAUDE.md`: "Frame Fix Wrapper" section explains the overall wrapper
  injection mechanism.
- `nix/claude-desktop.nix`: explains why the correction is needed on NixOS in
  the `installPhase` comment block.
