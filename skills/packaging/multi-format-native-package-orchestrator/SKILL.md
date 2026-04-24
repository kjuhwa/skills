---
name: multi-format-native-package-orchestrator
description: Orchestrate building a single Electron app source into .deb, .rpm, AppImage, and Nix outputs from one script. Handles architecture detection, distro-family detection, format-specific build dispatch, and shared staging.
category: packaging
version: 1.0.0
tags: [electron, packaging, deb, rpm, appimage, nix, build-orchestration, linux]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# Multi-Format Native Package Orchestrator

## When to use

Use this pattern when:
- You need to produce `.deb`, `.rpm`, AppImage, and/or Nix packages from a single Electron (or generic Node.js) application source.
- The build must run on multiple host distros (Debian-family, Fedora-family, NixOS, or generic) and auto-select the appropriate output format.
- You want a single entry-point script that handles dependencies, staging, patching, and format-specific sub-scripts with a consistent interface.
- You want to pass a shared staging directory between stages so each format script does not re-download or re-extract the source.

## Pattern

### Architecture

```
build.sh (orchestrator)
  ├── detect_architecture()    → sets $architecture, $download_url, $sha256
  ├── detect_distro()          → sets $distro_family
  ├── parse_arguments()        → sets $build_format (override or auto)
  ├── check_dependencies()     → installs missing tools per distro
  ├── download_and_extract()   → fills $app_staging_dir
  ├── patch_app()              → modifies staging dir (shared for all formats)
  └── dispatch to sub-script:
        scripts/build-deb-package.sh    $version $arch $work_dir $staging ...
        scripts/build-rpm-package.sh    $version $arch $work_dir $staging ...
        scripts/build-appimage.sh       $version $arch $work_dir $staging ...
        (nix handled inline or via nix derivation)
```

### Shared staging directory contract

Each format sub-script receives a consistent set of positional arguments:
```
$1  version
$2  architecture   (amd64|arm64)
$3  work_dir       (top-level build directory)
$4  app_staging_dir (prepared app files: app.asar, app.asar.unpacked, node_modules/)
$5  package_name
$6  maintainer     (for deb; ignored by others)
$7  description
```

This contract means the orchestrator patches the app once and every format sub-script consumes the same artifact tree.

## Minimal example

```bash
#!/usr/bin/env bash
# Orchestrator skeleton

architecture=''
distro_family=''
build_format=''
work_dir='build'
app_staging_dir='build/electron-app'

detect_architecture() {
    local raw_arch
    raw_arch=$(uname -m)
    case "$raw_arch" in
        x86_64)  architecture='amd64' ;;
        aarch64) architecture='arm64' ;;
        *) echo "Unsupported arch: $raw_arch" >&2; exit 1 ;;
    esac
}

detect_distro() {
    if   [[ -f /etc/debian_version ]]; then distro_family='debian'
    elif [[ -f /etc/fedora-release  ]]; then distro_family='rpm'
    elif [[ -f /etc/NIXOS           ]]; then distro_family='nix'
    else                                     distro_family='unknown'
    fi
}

parse_arguments() {
    # Default format from distro; override with --build flag
    case "$distro_family" in
        debian)  build_format='deb'      ;;
        rpm)     build_format='rpm'      ;;
        nix)     build_format='nix'      ;;
        *)       build_format='appimage' ;;
    esac

    while (( $# > 0 )); do
        case "$1" in
            -b|--build) build_format="$2"; shift 2 ;;
            *) echo "Unknown flag: $1" >&2; exit 1 ;;
        esac
    done
}

prepare_staging() {
    mkdir -p "$app_staging_dir"
    # ... download, extract, patch into $app_staging_dir
}

dispatch() {
    local pkg_name='my-electron-app'
    local maintainer='Maintainers <maintainers@example.com>'
    local description='My Electron app for Linux'

    case "$build_format" in
        deb)
            bash scripts/build-deb-package.sh \
                "$version" "$architecture" "$work_dir" "$app_staging_dir" \
                "$pkg_name" "$maintainer" "$description"
            ;;
        rpm)
            bash scripts/build-rpm-package.sh \
                "$version" "$architecture" "$work_dir" "$app_staging_dir" \
                "$pkg_name" "$maintainer" "$description"
            ;;
        appimage)
            bash scripts/build-appimage.sh \
                "$version" "$architecture" "$work_dir" "$app_staging_dir" \
                "$pkg_name"
            ;;
        nix)
            echo "Nix builds are handled by the flake; run: nix build .#my-app"
            ;;
    esac
}

detect_architecture
detect_distro
parse_arguments "$@"
prepare_staging
dispatch
```

## Why this works

### Single staging pass, multiple format outputs

Patching the app once into a shared staging directory means every format sub-script consumes an identical, pre-validated artifact. This eliminates format-specific drift where, for example, the deb package gets a patch that the AppImage doesn't.

### Auto-detection + override

Defaulting the build format to the detected distro family means CI on Debian builds `.deb` automatically, while still allowing `--build appimage` for explicit cross-format builds on any host. The `--build` flag is the escape hatch.

### Positional argument contract for sub-scripts

Using a fixed positional argument order (version, arch, work_dir, staging_dir, package_name, maintainer, description) means sub-scripts are independently testable: you can call `bash scripts/build-deb-package.sh 1.0.0 amd64 /tmp/build /tmp/staging my-app "Me" "App"` without the orchestrator.

### Architecture mapping at the boundary

Architecture names differ by ecosystem: `amd64`/`arm64` (Debian), `x86_64`/`aarch64` (RPM/kernel), `x64`/`arm64` (Node.js). Convert at the outermost layer (detect_architecture produces `amd64`/`arm64`) and let each sub-script remap to its own convention. Never pass raw `uname -m` output to sub-scripts.

## Pitfalls

- **Do not call sub-scripts with `source`** — they use `exit 1` for error handling. A sourced sub-script that exits kills the orchestrator's shell. Use `bash subscript.sh` or invoke as a subprocess.
- **Work directory must be absolute** — sub-scripts `cd` into various locations; relative paths become invalid. Use `realpath` or `$(pwd)/build`.
- **Format-specific tool availability** — `dpkg-deb` is only on Debian, `rpmbuild` only on Fedora. Validate tool availability before dispatch, or install via the dependency check step.
- **Nix builds cannot use the same staging** — Nix derivations run in a sandbox and must fetch sources via `fetchurl`. The orchestrator's downloaded-and-extracted staging dir is not accessible inside the Nix sandbox. Pass source via `--exe` flag or a Nix flake input instead.
- **Version strings with hyphens break RPM** — RPM's `Version:` field forbids hyphens. If your version is `1.0.0-2.3.4`, the orchestrator must split it into `rpm_version=1.0.0` and `rpm_release=2.3.4` before invoking the RPM sub-script.

## Source reference

`build.sh` — functions `detect_architecture`, `detect_distro`, `parse_arguments`, and the final dispatch block near end of file
