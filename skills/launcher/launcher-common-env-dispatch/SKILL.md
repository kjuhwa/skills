---
name: launcher-common-env-dispatch
description: Share display detection, singleton-lock cleanup, orphaned daemon termination, and Electron args construction across multiple package format launchers (deb, rpm, AppImage, Nix) via a sourced common library. Each package-specific launcher sources the library and calls the shared functions.
category: launcher
version: 1.0.0
tags: [launcher, bash, shared-library, electron, deb, rpm, appimage, nix, display-detection]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# Launcher Common Env Dispatch

## When to use

Use this pattern when:
- You have multiple package formats (deb, rpm, AppImage, Nix) for the same Electron application.
- Each package format needs a launcher script with the same core behavior (display detection, lock cleanup, environment setup, Electron arg building).
- You want to maintain the core logic in one place without duplicating it across four launcher scripts.
- Each launcher script has format-specific differences (path to Electron binary, `--no-sandbox` requirement for AppImage, install prefix) that need to be parameterized.

## Pattern

### Library file (`launcher-common.sh`)

A sourceable bash library installed to a fixed path within each package format:
- deb/rpm: `/usr/lib/<package-name>/launcher-common.sh`
- AppImage: `$APPDIR/usr/lib/<package-name>/launcher-common.sh`
- Nix: `$out/lib/<package-name>/launcher-common.sh`

The library provides:
```
setup_logging()                  → creates $log_dir, $log_file
log_message(msg)                 → appends to $log_file
detect_display_backend()         → sets $is_wayland, $use_x11_on_wayland
check_display()                  → returns 0 if display available
build_electron_args(type)        → sets $electron_args array
setup_electron_env()             → exports ELECTRON_FORCE_IS_PACKAGED etc.
cleanup_stale_lock()             → removes stale SingletonLock
cleanup_orphaned_daemon()        → kills orphaned helper daemon
cleanup_stale_socket()           → removes stale IPC socket
run_doctor(electron_path)        → runs all diagnostic checks
```

### Package-specific launcher

Each launcher sets its own paths, sources the library, then calls the shared functions in a fixed order:

```
source "/path/to/launcher-common.sh"

# 1. Setup
setup_logging
setup_electron_env

# 2. Cleanup (order matters: daemon → lock → socket)
cleanup_orphaned_daemon
cleanup_stale_lock
cleanup_stale_socket

# 3. Display detection
detect_display_backend

# 4. Build args (passing package type for --no-sandbox decision)
build_electron_args '<type>'   # 'deb', 'rpm', 'appimage', 'nix'
electron_args+=("$app_path")  # app path last

# 5. Exec
exec "$electron_exec" "${electron_args[@]}" "$@"
```

## Minimal example

```bash
# launcher-common.sh — shared library, install to all package formats

# Setup logging
# Sets: $log_dir, $log_file
setup_logging() {
    log_dir="${XDG_CACHE_HOME:-$HOME/.cache}/my-electron-app"
    mkdir -p "$log_dir" || return 1
    log_file="$log_dir/launcher.log"
}

log_message() { echo "$1" >> "$log_file"; }

# Detect display backend
# Sets: $is_wayland (true|false), $use_x11_on_wayland (true|false)
detect_display_backend() {
    is_wayland=false
    [[ -n "${WAYLAND_DISPLAY:-}" ]] && is_wayland=true
    use_x11_on_wayland=true
    [[ "${MYAPP_USE_WAYLAND:-}" == '1' ]] && use_x11_on_wayland=false

    if [[ $is_wayland == true && $use_x11_on_wayland == true ]]; then
        local desktop="${XDG_CURRENT_DESKTOP:-}"; desktop="${desktop,,}"
        if [[ -n "${NIRI_SOCKET:-}" || "$desktop" == *niri* ]]; then
            use_x11_on_wayland=false
        fi
    fi
}

check_display() { [[ -n $DISPLAY || -n $WAYLAND_DISPLAY ]]; }

# Build electron args
# $1: package type (appimage | deb | nix)
# Sets: $electron_args array
build_electron_args() {
    local pkg_type="${1:-deb}"
    electron_args=()
    [[ $pkg_type == 'appimage' ]] && electron_args+=('--no-sandbox')
    electron_args+=('--disable-features=CustomTitlebar')
    [[ $is_wayland != true ]] && return

    [[ $pkg_type == 'deb' || $pkg_type == 'nix' ]] && electron_args+=('--no-sandbox')

    if [[ $use_x11_on_wayland == true ]]; then
        electron_args+=('--ozone-platform=x11')
    else
        electron_args+=('--enable-features=UseOzonePlatform,WaylandWindowDecorations')
        electron_args+=('--ozone-platform=wayland')
        electron_args+=('--enable-wayland-ime')
        electron_args+=('--wayland-text-input-version=3')
    fi
}

setup_electron_env() {
    export ELECTRON_FORCE_IS_PACKAGED=true
    export ELECTRON_USE_SYSTEM_TITLE_BAR=1
}

cleanup_stale_lock() {
    local lock_file="${XDG_CONFIG_HOME:-$HOME/.config}/MyApp/SingletonLock"
    [[ -L $lock_file ]] || return 0
    local target pid
    target=$(readlink "$lock_file" 2>/dev/null) || return 0
    pid="${target##*-}"
    [[ $pid =~ ^[0-9]+$ ]] || return 0
    kill -0 "$pid" 2>/dev/null && return 0
    rm -f "$lock_file"
    log_message "Removed stale lock (PID $pid)"
}

cleanup_orphaned_daemon() {
    local daemon_pids
    daemon_pids=$(pgrep -f 'my-daemon\.js' 2>/dev/null) || return 0
    local pid cmdline
    for pid in $(pgrep -f 'my-electron-app' 2>/dev/null); do
        cmdline=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null) || continue
        [[ $cmdline == *my-daemon* ]] && continue
        return 0  # non-daemon process found, not orphaned
    done
    for pid in $daemon_pids; do kill "$pid" 2>/dev/null || true; done
    log_message "Killed orphaned daemon (PIDs: $daemon_pids)"
}

cleanup_stale_socket() {
    local sock="${XDG_RUNTIME_DIR:-/tmp}/my-service.sock"
    [[ -S $sock ]] || return 0
    if command -v socat &>/dev/null; then
        socat -u OPEN:/dev/null UNIX-CONNECT:"$sock" 2>/dev/null && return 0
    else
        [[ -z $(find "$sock" -mmin +1440 2>/dev/null) ]] && return 0
    fi
    rm -f "$sock"
    log_message "Removed stale service socket"
}

run_doctor() {
    local electron_path="${1:-}"
    echo "=== My App Diagnostics ==="
    # ... diagnostic checks ...
}
```

```bash
#!/usr/bin/env bash
# deb-launcher.sh — package-specific launcher for .deb

source "/usr/lib/my-electron-app/launcher-common.sh"

if [[ "${1:-}" == '--doctor' ]]; then
    run_doctor "/usr/lib/my-electron-app/node_modules/electron/dist/electron"
    exit $?
fi

setup_logging || exit 1
setup_electron_env
cleanup_orphaned_daemon
cleanup_stale_lock
cleanup_stale_socket

if ! check_display; then
    echo "Error: No display detected." >&2; exit 1
fi

detect_display_backend
log_message "--- Launcher Start (deb) ---"
log_message "Timestamp: $(date)"

electron_exec="/usr/lib/my-electron-app/node_modules/electron/dist/electron"
app_path="/usr/lib/my-electron-app/node_modules/electron/dist/resources/app.asar"

build_electron_args 'deb'
electron_args+=("$app_path")

cd "/usr/lib/my-electron-app" || exit 1
log_message "Exec: $electron_exec ${electron_args[*]} $*"
"$electron_exec" "${electron_args[@]}" "$@" >> "$log_file" 2>&1
exit_code=$?
log_message "Exited: $exit_code"
exit $exit_code
```

```bash
#!/usr/bin/env bash
# appimage-apprun.sh — AppRun for AppImage package format

appdir=$(dirname "$(readlink -f "$0")")
source "$appdir/usr/lib/my-electron-app/launcher-common.sh"

if [[ "${1:-}" == '--doctor' ]]; then
    run_doctor "$appdir/usr/lib/node_modules/electron/dist/electron"
    exit $?
fi

setup_logging || exit 1
setup_electron_env
cleanup_orphaned_daemon
cleanup_stale_lock
cleanup_stale_socket
detect_display_backend

electron_exec="$appdir/usr/lib/node_modules/electron/dist/electron"
app_path="$appdir/usr/lib/node_modules/electron/dist/resources/app.asar"

build_electron_args 'appimage'
electron_args+=("$app_path")
cd "$HOME" || exit 1
exec "$electron_exec" "${electron_args[@]}" "$@" >> "$log_file" 2>&1
```

## Why this works

### Single implementation, multiple format consumers

The shared library contains all logic that does not vary by package format: display detection, Wayland/X11 flag selection, lock cleanup, socket cleanup, daemon termination, and the doctor diagnostic framework. The only format-specific differences are:
- Path to `launcher-common.sh` (absolute path for deb/rpm, APPDIR-relative for AppImage, Nix store path for Nix).
- Path to Electron binary and app.asar.
- Package type argument to `build_electron_args` (which determines `--no-sandbox` behavior).

### `source` vs `bash scripts/...`

Using `source` (instead of spawning a subprocess) means the library's variables (`$log_file`, `$electron_args`, `$is_wayland`) are set in the current shell's environment. `build_electron_args` sets `$electron_args` as an array in the current shell — this would not work in a subprocess without complex serialization.

### `build_electron_args` is parameterized by package type

The `--no-sandbox` flag is always required for AppImage (FUSE constraint) and required for deb/nix on Wayland (sandbox detection bug), but not for deb on X11. Passing the package type as a parameter keeps this logic centralized rather than duplicated in each launcher.

### Cleanup order: daemon → lock → socket

The orphaned daemon must be killed before cleaning up locks and sockets because:
1. The daemon may hold the LevelDB lock (inside `SingletonLock` territory).
2. The daemon may own the service socket.
Cleaning these before killing the daemon either fails silently (they're still locked) or causes the daemon to crash noisily with data corruption.

## Pitfalls

- **Library path must be absolute in deb/rpm launchers** — the deb/rpm launcher runs from an arbitrary CWD. Using a relative source path will fail unless the CWD happens to be the right directory. Always use absolute paths in `source` for system-installed launchers.
- **Nix substitute-in-place for library path** — in Nix derivations, the library path contains the Nix store hash and cannot be hardcoded. Use `substituteInPlace` or string interpolation in the `installPhase` to inject the correct path.
- **`electron_args` array is reset by `build_electron_args`** — `build_electron_args` always starts with `electron_args=()`. Do not add custom flags before calling it; add them after.
- **`check_display` before display detection** — call `check_display` before `detect_display_backend` in interactive launchers (not AppImage, which may run in headless CI). If there is no display, exit with a user-friendly error message rather than letting Electron crash with a cryptic error.
- **Single-quoting the `--doctor` expansion** — use `[[ "${1:-}" == '--doctor' ]]` (double-quoted with `:-` default) rather than `[[ $1 == --doctor ]]`. `$1` is unset when the script runs with no arguments, and unquoted unset variables cause `[[` to see `==` with no left operand in strict shells.

## Source reference

`scripts/launcher-common.sh` — full library; `scripts/build-deb-package.sh` and `scripts/build-appimage.sh` — launchers that source it; `nix/claude-desktop.nix` — Nix launcher using the same functions
