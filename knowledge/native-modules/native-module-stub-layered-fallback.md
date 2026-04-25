---
version: 0.1.0-draft
name: native-module-stub-layered-fallback
summary: When stubbing a missing native module for a different OS, use a layered fallback strategy: route to the framework equivalent where one exists (e.g., `BrowserWindow.isMaximized()`), no-op for OS-specific features with no equivalent, and an explicit stub for auth flows that signals unavailability without crashing.
category: native-modules
tags: [native-modules, stub, electron, linux, platform-compatibility, node-gyp, fallback]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: medium
---

# Native Module Stub: Layered Fallback Strategy

## Context

Electron apps may ship a Windows/macOS native module (`@scope/native-addon`)
that wraps OS-level APIs (window effects, system authentication dialogs,
taskbar progress, attention flashing). When redistributing such an app for
Linux, the native module either does not compile or does not make sense for
Linux. A stub module is needed that satisfies the app's `require()` without
crashing.

The naive approach — stub every function as `() => {}` — causes subtle bugs:
functions that should return values return `undefined`, calls that should
trigger real behavior (like flashing a taskbar icon) silently do nothing, and
auth flows that should display a browser window just hang.

## Observation

A better approach has three layers:

**Layer 1: Framework equivalent** — for functions where the Electron API
provides the same functionality on Linux, delegate to it:

```js
// getIsMaximized: Electron's BrowserWindow.isMaximized() works on Linux
getIsMaximized: () => {
  const win = BrowserWindow.getFocusedWindow()
    || BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
  return win ? win.isMaximized() : false;
},

// flashFrame: natively supported on Linux (Unity, KDE, GNOME taskbar)
flashFrame: (flash) => {
  const win = getWindow();
  if (win) win.flashFrame(typeof flash === 'boolean' ? flash : true);
},

// setProgressBar: natively supported on Linux (Unity launcher API)
setProgressBar: (progress) => {
  const win = getWindow();
  if (win) win.setProgressBar(Math.max(0, Math.min(1, progress)));
},
```

**Layer 2: No-op** — for functions whose behavior is purely cosmetic and
platform-specific with no equivalent:

```js
setWindowEffect: () => {},    // Windows Mica/Acrylic glass effect
removeWindowEffect: () => {}, // same
setOverlayIcon: () => {},     // Windows taskbar overlay icon (no equivalent)
showNotification: () => {},   // may have an equivalent but low priority
```

**Layer 3: Explicit stub signaling unavailability** — for auth/security flows
where "silently succeed" would be wrong (e.g., an OS-level auth dialog):

```js
class AuthRequest {
  static isAvailable() {
    return false;  // tells the caller to use a fallback path
  }

  async start(url, scheme, windowHandle) {
    throw new Error('AuthRequest not available on Linux');
  }

  cancel() {}  // no-op is safe here
}
```

The `isAvailable()` pattern is critical: the app can check it before attempting
to use the feature, rather than discovering unavailability via an exception.

## Why it happens

OS-specific native modules wrap platform APIs that have varying degrees of
equivalence on Linux:
- Window effects (Mica, Acrylic): no Linux equivalent.
- Taskbar progress: equivalent exists (Unity launcher API, exposed via Electron).
- Attention flashing: equivalent exists (`flashFrame` in Electron).
- OS-level auth dialogs (Windows Hello, macOS TouchID): no Linux equivalent
  in Electron (requires OS credential manager).

Treating all three cases the same (all no-ops or all throws) leads to either
silent failures or unnecessary crashes.

## Practical implication

When writing a native module stub:
1. Inventory all exported symbols.
2. For each symbol, determine: (a) does an Electron/Node.js API provide
   equivalent behavior on Linux? (b) is a no-op safe, or will the caller
   break without a real return value? (c) does a missing feature need to be
   explicitly signaled?
3. Use lazy `require('electron')` inside stub functions to avoid circular
   dependency issues at module load time.
4. Filter destroyed windows in `getWindow()` helper to prevent errors from
   `flashFrame()` or `isMaximized()` on destroyed windows.

## Source reference

- `scripts/claude-native-stub.js`: complete implementation showing all three
  layers — `getIsMaximized`, `flashFrame`, `setProgressBar` (functional via
  Electron); `setWindowEffect`, `setOverlayIcon`, `showNotification` (no-ops);
  `AuthRequest` class with `isAvailable() { return false }` (explicit stub).
