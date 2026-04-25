---
name: native-module-stub-with-electron-fallback
description: Stub a missing platform-specific native addon by routing supported methods to Electron equivalents (flashFrame, setProgressBar) and providing safe no-ops for unsupported ones. Enables a Windows-targeted Electron app to run on Linux without the native binary.
category: native-modules
version: 1.0.0
tags: [electron, native-module, stub, linux, node-addon, compatibility]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# Native Module Stub with Electron Fallback

## When to use

Use this pattern when:
- A third-party Electron app includes a platform-specific native addon (`.node` file) that does not exist or cannot be compiled for your target platform.
- The app `require`s the addon unconditionally and will crash at startup if it is not found.
- Some of the addon's exported functions have equivalents in Electron's built-in APIs (e.g., `flashFrame`, `setProgressBar`, window state queries).
- Other exported functions are genuinely unsupported on the target platform and should be safe no-ops.

## Pattern

1. Identify the module path the app uses (e.g., `@vendor/app-native`).
2. Create a stub `index.js` at that path inside the app's `node_modules`.
3. In the stub, implement each exported function:
   - **Functional**: delegate to the equivalent Electron API.
   - **No-op**: return `undefined` or a sensible default (`false`, `''`).
   - **Unavailable**: return `false` from `isAvailable()` static methods to trigger the app's own fallback logic.
4. Use lazy `require('electron')` inside each function to avoid circular dependency issues at module init time.
5. Export a `KeyboardKey` frozen enum if the native module exports one — it is typically pure data and does not need platform-specific behavior.

## Minimal example

```javascript
// node_modules/@vendor/app-native/index.js
// Stub implementation for Linux (replaces Windows-only native addon)

// Keyboard key enum — pure data, no platform dependency
const KeyboardKey = Object.freeze({
    Backspace: 43,
    Tab: 280,
    Enter: 261,
    Escape: 85,
    Space: 276,
    // ... add keys as needed
});

// Helper: get focused or first non-destroyed BrowserWindow
// Lazy-loaded to avoid circular dependency with Electron's module system.
function getWindow() {
    try {
        const { BrowserWindow } = require('electron');
        const focused = BrowserWindow.getFocusedWindow();
        if (focused) return focused;
        return BrowserWindow.getAllWindows().find(w => !w.isDestroyed()) || null;
    } catch (e) {
        return null;
    }
}

// Unavailable feature: return false from isAvailable() so the app falls
// back to its own alternative flow (e.g., system browser for OAuth).
class NativeAuthRequest {
    static isAvailable() { return false; }
    async start(url, scheme, windowHandle) {
        throw new Error('NativeAuthRequest not available on this platform');
    }
    cancel() {}
}

module.exports = {
    // Platform version stub (app may check this string)
    getWindowsVersion: () => '10.0.0',

    // Functional: Electron natively supports flash frame on Linux
    flashFrame: (flash) => {
        const win = getWindow();
        if (win) win.flashFrame(typeof flash === 'boolean' ? flash : true);
    },
    clearFlashFrame: () => {
        const win = getWindow();
        if (win) win.flashFrame(false);
    },

    // Functional: Electron natively supports task bar progress on Linux
    setProgressBar: (progress) => {
        const win = getWindow();
        if (win && typeof progress === 'number') {
            win.setProgressBar(Math.max(0, Math.min(1, progress)));
        }
    },
    clearProgressBar: () => {
        const win = getWindow();
        if (win) win.setProgressBar(-1);
    },

    // Functional: window state query
    getIsMaximized: () => {
        const win = getWindow();
        return win ? win.isMaximized() : false;
    },

    // No-ops: Windows-specific visual effects not supported
    setWindowEffect: () => {},
    removeWindowEffect: () => {},

    // No-ops: Windows overlay icon (taskbar badge) not supported
    setOverlayIcon: () => {},
    clearOverlayIcon: () => {},

    // No-ops: Desktop notifications handled elsewhere
    showNotification: () => {},

    // Enum: pure data
    KeyboardKey,

    // Unavailable class
    NativeAuthRequest,
};
```

To inject the stub during the build:
```bash
# Place the stub at the addon's expected module path inside the asar
STUB_DIR="app.asar.contents/node_modules/@vendor/app-native"
mkdir -p "$STUB_DIR"
cp scripts/app-native-stub.js "$STUB_DIR/index.js"

# Also create a minimal package.json so require() resolves correctly
cat > "$STUB_DIR/package.json" << 'EOF'
{ "name": "@vendor/app-native", "version": "0.0.0", "main": "index.js" }
EOF
```

## Why this works

### Lazy `require('electron')` avoids circular initialization

If you `require('electron')` at the top of the stub module, and the stub is loaded before Electron's main process is fully initialized (which can happen in preload scripts), you get an empty or partial module object. Wrapping the require inside each function delays it until the first call, by which time Electron's module is fully initialized.

### `isAvailable() → false` triggers app-side fallbacks

Well-designed Electron apps check `NativeModule.isAvailable()` before using platform-specific features and fall back to a cross-platform alternative (e.g., opening the system browser for OAuth). By returning `false` from a static `isAvailable()` method, you activate the app's own fallback logic without any patching of the app's code.

### `getWindow()` fallback chain

`getFocusedWindow()` returns `null` when no window has focus (app is in background, minimized, etc.). The fallback to `getAllWindows().find(w => !w.isDestroyed())` ensures operations like `flashFrame` and `setProgressBar` still work when the window is minimized or backgrounded, which is the primary use case for both of those features.

### `setProgressBar(-1)` clears the bar

Electron's `setProgressBar(-1)` removes the progress indicator from the taskbar (Unity, KDE, GNOME). This maps directly to the expected behavior of `clearProgressBar()`.

## Pitfalls

- **Stub must be inside the `.asar` at the exact module path** — if the app uses `require('@vendor/app-native')` and you place the stub outside the asar, Node.js will not find it (the asar is the root of the app's require path).
- **Do not stub with the `.node` extension** — place an `index.js` stub, not a stub with `.node` extension. Requiring a `.node` file goes through Node's native addon loader, not the JS loader.
- **`getWindow()` may return a popup** — the fallback `getAllWindows().find(...)` may return a popup or quick-entry window instead of the main window. Operations like `getIsMaximized()` can behave unexpectedly on popups. Document this limitation and callers should be aware.
- **KeyboardKey enum must be frozen** — the app may compare entries by identity or use it in switch statements. `Object.freeze()` prevents accidental mutation.
- **`setProgressBar` clamp to `[0, 1]`** — Electron's `setProgressBar` on Linux accepts values 0-1. Some apps pass values like 0.5 correctly, but some may pass raw byte counts. Clamp defensively.

## Source reference

`scripts/claude-native-stub.js` — full implementation
