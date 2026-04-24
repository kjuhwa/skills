---
name: wayland-ime-input-method-flags
description: Enable native Wayland input method support (IBus/Fcitx5/etc.) in Electron apps by adding --enable-wayland-ime and --wayland-text-input-version=3 flags when running in native Wayland mode. Explains why these are only safe in native Wayland, not XWayland.
category: launcher
version: 1.0.0
tags: [wayland, ime, input-method, ibus, fcitx5, electron, launcher, i18n]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# Wayland IME Input Method Flags for Electron

## When to use

Use this pattern when:
- Your Electron app launcher supports both XWayland mode and native Wayland mode.
- Users need to input text using an Input Method Editor (IME) like IBus (for CJK languages) or Fcitx5.
- Native Wayland IME support requires specific Chromium/Electron command-line flags.
- You want to enable IME support only in native Wayland mode (not XWayland mode, where it is unnecessary or potentially harmful).

## Pattern

Add the following flags to the Electron args array **only when native Wayland mode is active** (i.e., `--ozone-platform=wayland` is being used, not `--ozone-platform=x11`):

```bash
--enable-wayland-ime
--wayland-text-input-version=3
```

In the display backend detector, this becomes:

```bash
if [[ $use_x11_on_wayland == false ]]; then
    # Native Wayland mode: add IME flags
    electron_args+=('--ozone-platform=wayland')
    electron_args+=('--enable-features=UseOzonePlatform,WaylandWindowDecorations')
    electron_args+=('--enable-wayland-ime')
    electron_args+=('--wayland-text-input-version=3')
fi
```

## Minimal example

```bash
#!/usr/bin/env bash
# Launcher that enables Wayland IME in native Wayland mode

is_wayland=false
use_x11_on_wayland=true
electron_args=()

detect_display_backend() {
    [[ -n "${WAYLAND_DISPLAY:-}" ]] && is_wayland=true
    [[ "${MYAPP_USE_WAYLAND:-}" == '1' ]] && use_x11_on_wayland=false

    # Force native Wayland for compositors without XWayland
    if [[ $is_wayland == true && $use_x11_on_wayland == true ]]; then
        local desktop="${XDG_CURRENT_DESKTOP:-}"
        desktop="${desktop,,}"
        [[ -n "${NIRI_SOCKET:-}" || "$desktop" == *niri* ]] \
            && use_x11_on_wayland=false
    fi
}

build_electron_args() {
    local package_type="${1:-deb}"

    electron_args=()
    [[ $package_type == 'appimage' ]] && electron_args+=('--no-sandbox')
    electron_args+=('--disable-features=CustomTitlebar')

    if [[ $is_wayland != true ]]; then
        return  # Pure X11: no special flags needed
    fi

    [[ $package_type == 'deb' || $package_type == 'nix' ]] \
        && electron_args+=('--no-sandbox')

    if [[ $use_x11_on_wayland == true ]]; then
        # XWayland mode: global hotkeys work, IME via X11 (usually works too)
        electron_args+=('--ozone-platform=x11')
    else
        # Native Wayland mode: add IME support flags
        electron_args+=('--enable-features=UseOzonePlatform,WaylandWindowDecorations')
        electron_args+=('--ozone-platform=wayland')
        electron_args+=('--enable-wayland-ime')
        electron_args+=('--wayland-text-input-version=3')
    fi
}

detect_display_backend
build_electron_args 'deb'
electron_args+=("/usr/lib/myapp/app.asar")
exec "/usr/lib/myapp/electron" "${electron_args[@]}" "$@"
```

## Why this works

### `--enable-wayland-ime`

This flag enables Chromium's Wayland Input Method support. Without it, Electron on Wayland ignores IBus/Fcitx5 and falls back to direct keyboard input only, which does not support CJK composition or other IME-based input.

### `--wayland-text-input-version=3`

The Wayland text-input protocol has multiple versions. IBus and Fcitx5 on modern systems use version 3 (`zwp_text_input_v3`). Without this flag, Chromium defaults to version 1, which IBus/Fcitx5 may not implement, resulting in no IME functionality. Setting version 3 ensures compatibility with modern input method frameworks.

### IME flags only in native Wayland mode

In XWayland mode (`--ozone-platform=x11`), the app communicates with the X server through XWayland. IME in this mode uses the X11 XIM protocol, which most IMEs implement. Adding Wayland-specific IME flags in XWayland mode can confuse the input stack because there are conflicting signals about which protocol to use. Only add these flags when `--ozone-platform=wayland` is active.

### IME vs. global hotkeys tradeoff

Enabling native Wayland mode (and thus IME flags) disables global hotkeys. This is the fundamental tradeoff in the display backend detector:
- XWayland mode: global hotkeys work, IME usually works via X11 XIM.
- Native Wayland mode: IME works via Wayland text-input-v3, global hotkeys may not work.

Users who primarily need IME should set `MYAPP_USE_WAYLAND=1`; users who need global hotkeys should use the default (XWayland) mode.

## Pitfalls

- **Do not add IME flags in XWayland mode** — mixing Wayland IME flags with `--ozone-platform=x11` can cause Electron to attempt using both X11 and Wayland input, resulting in neither working correctly.
- **IBus must be running as a Wayland input method** — `--enable-wayland-ime` only works if IBus (or Fcitx5) has been started with Wayland support. In older system configurations where IBus is started in X11 mode, the flag has no effect. Users may need to set `IBUS_USE_PORTAL=1` or configure their input method to start in Wayland mode.
- **`wayland-text-input-version=3` is Electron 20+** — older Electron versions may not support this flag. It is safe to include (unknown flags are ignored), but it has no effect on older versions.
- **GNOME/KDE may handle IME differently** — some desktop environments provide their own input method integration. Test IME behavior on the specific DE and Electron version combination you are targeting.
- **These flags may become defaults in future Electron** — as Wayland support matures in Chromium/Electron, these flags may become the default. Check the Electron changelog when upgrading.

## Source reference

`scripts/launcher-common.sh` — `build_electron_args()` function, native Wayland branch
