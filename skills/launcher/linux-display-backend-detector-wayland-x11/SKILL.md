---
name: linux-display-backend-detector-wayland-x11
description: Detect whether the current session is Wayland or X11, auto-route to XWayland for global hotkey support, and handle compositor-specific overrides (e.g. Niri which has no XWayland). Exports an Electron args array ready for exec.
category: launcher
version: 1.0.0
tags: [wayland, x11, electron, launcher, display-server, xwayland, compositor]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# Linux Display Backend Detector (Wayland / X11)

## When to use

Use this pattern when writing a launcher script for an Electron application on Linux that:
- Must run on both X11 and Wayland hosts.
- Uses global hotkeys (which require X11/XWayland; native Wayland Electron does not yet support global hotkeys universally).
- Must handle compositor edge cases — specifically compositors without XWayland (like Niri), which must use native Wayland even when global hotkeys are desired.
- Should allow a user override (`MYAPP_USE_WAYLAND=1`) to opt into native Wayland when they knowingly accept the hotkey limitation.

## Pattern

The detector runs three checks in order:

1. **Session type** — check `$WAYLAND_DISPLAY` and `$DISPLAY` env vars.
2. **Compositor override** — if Wayland, check `$XDG_CURRENT_DESKTOP` and compositor-specific socket env vars for compositors with no XWayland.
3. **User override** — check `$MYAPP_USE_WAYLAND` to allow forcing native Wayland mode.

Then assemble an `electron_args` array with the appropriate `--ozone-platform` flag.

### Package type affects `--no-sandbox`

- AppImage: always needs `--no-sandbox` (FUSE constraints prevent the setuid sandbox).
- deb/rpm/nix: need `--no-sandbox` only on Wayland (Electron sandbox detection is broken for some Wayland setups).
- X11: never needs `--no-sandbox` for security reasons.

## Minimal example

```bash
#!/usr/bin/env bash
# Sourced as a library; call detect_display_backend then build_electron_args

# Sets: is_wayland (bool string), use_x11_on_wayland (bool string)
detect_display_backend() {
    is_wayland=false
    [[ -n "${WAYLAND_DISPLAY:-}" ]] && is_wayland=true

    use_x11_on_wayland=true
    [[ "${MYAPP_USE_WAYLAND:-}" == '1' ]] && use_x11_on_wayland=false

    # Compositors with no XWayland: force native Wayland
    if [[ $is_wayland == true && $use_x11_on_wayland == true ]]; then
        local desktop="${XDG_CURRENT_DESKTOP:-}"
        desktop="${desktop,,}"   # lowercase
        # Niri compositor example: check socket env var AND desktop name
        # XDG_CURRENT_DESKTOP can be colon-separated ("niri:GNOME")
        if [[ -n "${NIRI_SOCKET:-}" || "$desktop" == *niri* ]]; then
            log_message "No-XWayland compositor detected — forcing native Wayland"
            use_x11_on_wayland=false
        fi
    fi
}

# Sets: electron_args array
# $1 = "appimage" | "deb" | "nix"
build_electron_args() {
    local package_type="${1:-deb}"
    electron_args=()

    # AppImage always needs --no-sandbox (FUSE)
    [[ $package_type == 'appimage' ]] && electron_args+=('--no-sandbox')

    # Disable custom title bar (better Linux WM integration)
    electron_args+=('--disable-features=CustomTitlebar')

    if [[ $is_wayland != true ]]; then
        # Pure X11 session — no extra flags needed
        return
    fi

    # Wayland: deb/nix also need --no-sandbox
    [[ $package_type == 'deb' || $package_type == 'nix' ]] \
        && electron_args+=('--no-sandbox')

    if [[ $use_x11_on_wayland == true ]]; then
        # Default: XWayland mode for global hotkey support
        electron_args+=('--ozone-platform=x11')
    else
        # Native Wayland mode (user opt-in or compositor forces it)
        electron_args+=('--enable-features=UseOzonePlatform,WaylandWindowDecorations')
        electron_args+=('--ozone-platform=wayland')
        electron_args+=('--enable-wayland-ime')
        electron_args+=('--wayland-text-input-version=3')
    fi
}

# Usage in launcher:
setup_logging
detect_display_backend
build_electron_args 'deb'       # or 'appimage' or 'nix'
electron_args+=("$app_path")   # app path must be last
exec "$electron_exec" "${electron_args[@]}" "$@"
```

## Why this works

### Global hotkeys require X11

Electron's global shortcut API (`globalShortcut.register`) relies on X11's `XGrabKey` mechanism on Linux. Native Wayland does not expose an equivalent API that Electron currently uses. Running the Electron app in XWayland mode (`--ozone-platform=x11`) even in a Wayland session preserves hotkey functionality because the app interacts with the X server through XWayland.

### `XDG_CURRENT_DESKTOP` can be colon-separated

Some compositors set `XDG_CURRENT_DESKTOP=niri:GNOME` or similar compound values. Glob matching with `*niri*` handles this correctly whereas a plain `==` equality check would fail. Always lowercase and glob-match.

### Compositor-specific socket env vars are more reliable than desktop name

`$NIRI_SOCKET` (or similar compositor-managed env vars) is set by the compositor itself and is not affected by user customization of `XDG_CURRENT_DESKTOP`. Checking it first, then falling back to the desktop name, gives two independent signals.

### --no-sandbox placement

The `--no-sandbox` flag must come before the app path in the Electron args array. Chromium parses flags in order; anything after the app path is treated as app arguments, not Chromium flags.

### IME flags for Wayland

`--enable-wayland-ime` and `--wayland-text-input-version=3` are required for IBus and Fcitx5 to work in native Wayland mode. They are harmless no-ops in XWayland mode but should only be added in native Wayland mode to avoid confusion.

## Pitfalls

- **Do not check `$XDG_SESSION_TYPE`** — it is less reliable than `$WAYLAND_DISPLAY`. Some Wayland sessions do not set `XDG_SESSION_TYPE=wayland` (especially in containers or when launched via `startx`/`startwayland` scripts).
- **Do not run the display check from a TTY** — if both `$DISPLAY` and `$WAYLAND_DISPLAY` are unset, exit with a user-friendly error rather than trying to launch a headless Electron app (which will crash with a cryptic error).
- **`electron_args` must be a proper Bash array** — not a space-delimited string. Paths with spaces in `$app_path` will break if you use string concatenation.
- **AppImage FUSE and `--no-sandbox`** — AppImages use FUSE to mount themselves. FUSE mounts do not support the setuid bit required by the Chromium sandbox. Always add `--no-sandbox` for AppImage launchers regardless of session type.

## Source reference

`scripts/launcher-common.sh` — functions `detect_display_backend` and `build_electron_args`
