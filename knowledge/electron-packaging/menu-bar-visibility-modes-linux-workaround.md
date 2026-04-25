---
version: 0.1.0-draft
name: menu-bar-visibility-modes-linux-workaround
summary: Electron's `autoHideMenuBar` on Linux causes layout shifts on Alt keypress in DEs like KDE Plasma; a three-mode env var (`auto`/`visible`/`hidden`) with boolean aliases gives users control, and `hidden` mode suppresses the Alt toggle by re-hiding on every `show` event.
category: electron-packaging
tags: [electron, menu-bar, linux, kde, wayland, autoHideMenuBar, ux, env-var]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: medium
---

# Menu Bar Visibility Modes on Linux

## Context

Electron's default `autoHideMenuBar: true` behavior hides the menu bar until
the user presses Alt, then shows it, then hides it again. On most desktop
environments this is acceptable. On KDE Plasma (and some other DEs), Alt is
heavily used for window management (Alt+drag to move, Alt+Tab, Alt+F4). The
menu bar appearing and disappearing on every Alt keypress causes a visible
layout shift and is disruptive for users.

Additionally, when the menu bar is hidden and `autoHideMenuBar` is active,
the `Ctrl+Q` keyboard shortcut from the application menu does not fire because
Electron does not dispatch menu accelerators when the menu bar is in
auto-hide state.

## Observation

Three distinct behaviors are useful:

| Mode | Menu visible | Alt toggles | Best for |
|------|-------------|-------------|---------|
| `auto` | No (default hidden) | Yes | Most DEs |
| `visible` | Yes (always) | No | Stable layout, no Alt shift |
| `hidden` | No (always) | No | Full Alt freedom |

Electron provides `autoHideMenuBar` (boolean) and `setMenuBarVisibility(bool)`,
but no built-in three-mode system. The `hidden` mode requires actively
suppressing the Alt toggle that `autoHideMenuBar` would normally allow.

The Alt toggle cannot be disabled via any Electron API directly — it is
hardcoded in Chromium's input handling when `autoHideMenuBar` is true.

## Why it happens

`autoHideMenuBar: true` tells Chromium to handle the Alt key as a menu
bar toggle. There is no Electron-level API to say "hide the menu bar but
do not respond to Alt". The only workaround is to set
`autoHideMenuBar: false` and manually re-hide the menu bar whenever it
would become visible.

The `show` event on a `BrowserWindow` fires when the window becomes visible
(including after an Alt press shows the menu bar). Re-hiding immediately on
`show` suppresses the visual effect.

## Practical implication

Implement the three-mode system in a preload wrapper:

```js
const VALID_MODES = ['auto', 'visible', 'hidden'];
const ALIASES = {
  '1': 'visible', 'true': 'visible', 'yes': 'visible', 'on': 'visible',
  '0': 'hidden',  'false': 'hidden', 'no': 'hidden',   'off': 'hidden',
};

const raw = (process.env.APP_MENU_BAR || 'auto').toLowerCase();
const mode = ALIASES[raw] || (VALID_MODES.includes(raw) ? raw : 'auto');
```

Apply at `BrowserWindow` construction (in a patched subclass):

```js
// 'auto': hidden by default, Alt toggles (Electron's built-in behavior)
// 'visible'/'hidden': no Alt toggle
options.autoHideMenuBar = (mode === 'auto');
```

After construction, force the initial visibility:

```js
if (mode !== 'visible') {
  this.setMenuBarVisibility(false);
}

// For 'hidden' mode: suppress Alt toggle by re-hiding on every show
if (mode === 'hidden') {
  this.on('show', () => {
    this.setMenuBarVisibility(false);
  });
}
```

Also intercept `Menu.setApplicationMenu` to re-hide on every menu update
(which Electron briefly shows the menu bar for):

```js
if (mode === 'hidden') {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.setMenuBarVisibility(false);
  }
}
```

Register a global `Ctrl+Q` shortcut explicitly to ensure quit works regardless
of menu bar state:

```js
electron.globalShortcut.register('CommandOrControl+Q', () => {
  electron.app.quit();
});
```

## Source reference

- `scripts/frame-fix-wrapper.js`: `MENU_BAR_MODE`, `MENU_BAR_ALIASES`,
  `options.autoHideMenuBar = (MENU_BAR_MODE === 'auto')`,
  `'hidden'` mode `show` event handler, `patchedSetApplicationMenu`.
- `docs/CONFIGURATION.md`: "Menu Bar" section — user-facing mode table and
  env var documentation.
