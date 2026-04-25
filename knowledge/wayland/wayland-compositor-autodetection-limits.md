---
version: 0.1.0-draft
name: wayland-compositor-autodetection-limits
summary: Detecting Wayland presence via `WAYLAND_DISPLAY` is insufficient for feature gating — compositors vary widely in XWayland support; reliable detection must check `XDG_CURRENT_DESKTOP` for known edge cases (e.g., Niri has no XWayland) to decide whether to force native Wayland or fall back to X11.
category: wayland
tags: [wayland, xwayland, compositor, detection, global-hotkeys, linux, electron]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# Wayland Compositor Autodetection Limits

## Context

Electron applications on Linux often need to choose between running via
XWayland (X11 compatibility layer under Wayland, enables global hotkeys) and
native Wayland mode (correct HiDPI, better performance, but breaks global
hotkeys and some features). The naïve approach is to check `WAYLAND_DISPLAY`:
if set, use native Wayland; if not, use X11. This breaks in practice.

## Observation

`WAYLAND_DISPLAY` being set does not imply:
- That XWayland is available or functional.
- That the compositor supports global hotkeys via XWayland.
- That any specific Wayland protocol extensions are present.

Concretely:
- **Niri** is a Wayland compositor that ships with no XWayland support. Setting
  `--ozone-platform=x11` on Niri crashes or produces a black window because
  there is no XWayland to connect to.
- **Sway** and **Hyprland** both support XWayland and work fine with
  `--ozone-platform=x11`, but some users on those compositors want native
  Wayland for DPI reasons.
- **GNOME on Wayland** supports XWayland but may not have the
  XDG GlobalShortcuts portal configured for Electron.

Global hotkeys (e.g., `Ctrl+Alt+Space` app-wide shortcuts) require the X11
`XGrabKey` mechanism, which only works via XWayland. Native Wayland mode
has no equivalent that Electron currently supports.

## Why it happens

Wayland is an umbrella protocol; the presence of a Wayland socket says nothing
about which optional protocols (XWayland, GlobalShortcuts portal, InputMethod
v3, etc.) the compositor implements. Compositor feature sets vary by project
philosophy: Niri explicitly avoids XWayland complexity; Sway/Hyprland embrace
it.

`XDG_CURRENT_DESKTOP` and compositor-specific environment variables
(e.g., `NIRI_SOCKET`) are currently the most reliable signals:

| Variable | Compositor | Has XWayland |
|---|---|---|
| `NIRI_SOCKET` set | Niri | No |
| `XDG_CURRENT_DESKTOP` contains `niri` | Niri | No |
| `XDG_CURRENT_DESKTOP` contains `sway` | Sway | Yes |
| `XDG_CURRENT_DESKTOP` contains `Hyprland` | Hyprland | Yes |

## Practical implication

Use a two-flag model in the launcher:

```bash
detect_display_backend() {
  is_wayland=false
  [[ -n "${WAYLAND_DISPLAY:-}" ]] && is_wayland=true

  # Default: prefer X11 via XWayland for hotkey support
  use_xwayland=true
  [[ "${APP_USE_WAYLAND:-}" == '1' ]] && use_xwayland=false

  # Override: compositors that have no XWayland must use native Wayland
  if [[ $is_wayland == true && $use_xwayland == true ]]; then
    local desktop="${XDG_CURRENT_DESKTOP:-}"
    desktop="${desktop,,}"  # lowercase

    # XDG_CURRENT_DESKTOP can be colon-separated: "niri:GNOME"
    # Glob matching handles this
    if [[ -n "${NIRI_SOCKET:-}" || "$desktop" == *niri* ]]; then
      use_xwayland=false
    fi
  fi
}
```

Then set `--ozone-platform` accordingly:
- `use_xwayland=true` → `--ozone-platform=x11` (forces XWayland even on Wayland)
- `use_xwayland=false` → `--ozone-platform=wayland --enable-features=UseOzonePlatform`

Document that native Wayland mode disables global hotkeys. Provide a user-visible
env var (`APP_USE_WAYLAND=1`) so knowledgeable users can opt in without
triggering it accidentally.

## Source reference

- `scripts/launcher-common.sh`: `detect_display_backend()` — full production
  implementation with Niri auto-detection.
- `docs/CONFIGURATION.md`: Wayland Support section — user-facing documentation
  explaining the tradeoff.
- `docs/TROUBLESHOOTING.md`: "Global Hotkey Not Working (Wayland)" — explains
  the symptom users see when native Wayland mode is active.
