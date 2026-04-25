---
version: 0.1.0-draft
name: electron-preload-wrapper-proxy-interception
summary: Electron's module exports use non-configurable property descriptors, so you cannot directly reassign `module.BrowserWindow`; instead, intercept `require('electron')` and return a `Proxy` that overrides only the properties you need.
category: electron-packaging
tags: [electron, proxy, monkey-patching, require, browserwindow, module-interception]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: medium
---

# Electron Preload Wrapper via Proxy Interception

## Context

When redistributing an Electron app you do not own, you sometimes need to
change the behavior of built-in Electron classes (e.g., `BrowserWindow`) for
all instances the app creates — for example, forcing `frame: true` on Linux
where the app ships with `frame: false` for macOS aesthetics.

The most direct approach is to override `require('electron').BrowserWindow`.
But Electron's module object uses non-configurable property getters, which
means assignment silently fails.

## Observation

Attempting to patch the Electron module directly:

```js
const electron = require('electron');
electron.BrowserWindow = PatchedBrowserWindow; // silently fails
```

fails because the `BrowserWindow` property is defined with
`configurable: false` (and possibly `writable: false`) via a getter. The
assignment does nothing; all subsequent `require('electron').BrowserWindow`
calls return the original.

`Object.defineProperty` to override also fails:
```js
Object.defineProperty(electron, 'BrowserWindow', { value: PatchedBrowserWindow });
// Throws: TypeError: Cannot redefine property: BrowserWindow
```

## Why it happens

Electron's main process exports are defined in the C++ layer and exposed to
Node.js as properties with `configurable: false`. This is intentional: Electron
prevents the host application from accidentally overwriting core bindings.
The property descriptor's `configurable: false` flag makes `Object.defineProperty`
throw and makes assignment silently no-op in strict mode (or silently succeed
without effect in sloppy mode).

## Practical implication

The correct approach is to intercept `Module.prototype.require` and return a
`Proxy` wrapping the real Electron module. The `Proxy` responds to property
accesses by substituting your patched classes for the specific properties you
need, while transparently delegating all other accesses to the real module.

```js
const Module = require('module');
const originalRequire = Module.prototype.require;

let PatchedBrowserWindow = null;
let electronModule = null;

Module.prototype.require = function(id) {
  const result = originalRequire.apply(this, arguments);

  if (id === 'electron') {
    // Build patch once on first require
    if (!PatchedBrowserWindow) {
      electronModule = result;
      const OriginalBrowserWindow = result.BrowserWindow;

      PatchedBrowserWindow = class PatchedBW extends OriginalBrowserWindow {
        constructor(options) {
          // apply your modifications to options here
          super(options);
        }
      };

      // Copy static methods (getAllWindows, fromId, etc.)
      for (const key of Object.getOwnPropertyNames(OriginalBrowserWindow)) {
        if (key === 'prototype' || key === 'length' || key === 'name') continue;
        try {
          const desc = Object.getOwnPropertyDescriptor(OriginalBrowserWindow, key);
          if (desc) Object.defineProperty(PatchedBrowserWindow, key, desc);
        } catch (_) {}
      }
    }

    // Return a Proxy that intercepts property reads
    return new Proxy(result, {
      get(target, prop, receiver) {
        if (prop === 'BrowserWindow') return PatchedBrowserWindow;
        return Reflect.get(target, prop, receiver);
      }
    });
  }

  return result;
};
```

Key points:
- Build the patched class **once** (cache it) to avoid rebuilding on every
  `require('electron')` call.
- Copy static methods (like `BrowserWindow.getAllWindows()`) from the original
  to the patched class, because the class body does not inherit statics.
- Use a separate nested `Proxy` for nested objects (e.g., `Menu`) if you also
  need to patch their methods.
- This wrapper must be the first JavaScript that runs (set as `package.json`
  `main` via a tiny entry-point shim).

## Source reference

- `scripts/frame-fix-wrapper.js`: complete implementation — `Module.prototype.require`
  override, cached `PatchedBrowserWindow`, static property copying loop, and
  `Proxy` return for the `electron` module including a nested `Proxy` for
  `Menu.setApplicationMenu`.
