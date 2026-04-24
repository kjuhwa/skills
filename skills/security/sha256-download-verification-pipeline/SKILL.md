---
name: sha256-download-verification-pipeline
description: Download a binary and verify it against an expected SHA-256 checksum before use. Supports per-architecture checksums, optional verification skip when hash is empty (with warning), and clear error messages with both expected and actual values.
category: security
version: 1.0.0
tags: [sha256, checksum, download, security, verification, bash, build]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# SHA-256 Download Verification Pipeline

## When to use

Use this pattern when:
- Your build script downloads binaries (executables, tarballs, packages) from the internet and uses them in the build process.
- You want to detect supply-chain attacks or corrupted downloads before the binary is used.
- You have per-architecture expected checksums that must be checked against the downloaded file.
- You want to support an optional skip (with warning) when a checksum is not yet known, without breaking the build for new versions.

## Pattern

### `verify_sha256` function

```bash
# Usage: verify_sha256 <file_path> <expected_hash> [label]
# Returns 0 on success, 1 on mismatch
# If expected_hash is empty: prints warning and returns 0 (skip mode)
verify_sha256() {
    local file_path="$1"
    local expected_hash="$2"
    local label="${3:-file}"
    ...
}
```

### Flow

```
detect_architecture
  → sets $download_url, $expected_sha256, $architecture

download_file
  → wget -O $file_path $download_url

verify_sha256 $file_path $expected_sha256 "label"
  → sha256sum $file_path
  → compare actual vs expected
  → fail loudly if mismatch, continue if match (or empty expected)
```

## Minimal example

```bash
#!/usr/bin/env bash

# Per-architecture configuration (set by detect_architecture or equivalent)
download_url=''
expected_sha256=''
architecture=''

detect_architecture() {
    local raw_arch
    raw_arch=$(uname -m)
    case "$raw_arch" in
        x86_64)
            download_url='https://cdn.example.com/releases/app-1.0.0-x64.tar.gz'
            expected_sha256='abc123def456...'  # 64-char hex SHA-256
            architecture='amd64'
            ;;
        aarch64)
            download_url='https://cdn.example.com/releases/app-1.0.0-arm64.tar.gz'
            expected_sha256='789xyz...'
            architecture='arm64'
            ;;
        *)
            echo "Unsupported architecture: $raw_arch" >&2
            exit 1
            ;;
    esac
}

# Verify a downloaded file against an expected SHA-256 hash.
# Empty expected_hash: warn and skip (useful for new versions before hash is known).
verify_sha256() {
    local file_path="$1"
    local expected_hash="$2"
    local label="${3:-file}"

    if [[ -z $expected_hash ]]; then
        echo "Warning: No SHA-256 hash for ${label}, skipping verification" >&2
        return 0
    fi

    echo "Verifying SHA-256 checksum for ${label}..."
    local actual_hash _
    read -r actual_hash _ < <(sha256sum "$file_path")

    if [[ $actual_hash != "$expected_hash" ]]; then
        echo "SHA-256 mismatch for ${label}!" >&2
        echo "  Expected: $expected_hash" >&2
        echo "  Actual:   $actual_hash" >&2
        return 1
    fi

    echo "SHA-256 verified: ${label}"
    return 0
}

download_and_verify() {
    local work_dir="$1"
    local filename="app-${architecture}.tar.gz"
    local file_path="$work_dir/$filename"

    echo "Downloading from $download_url..."
    if ! wget -O "$file_path" "$download_url"; then
        echo "Download failed" >&2
        exit 1
    fi

    if ! verify_sha256 "$file_path" "$expected_sha256" "$filename"; then
        rm -f "$file_path"   # Remove potentially corrupted file
        exit 1
    fi

    echo "File ready: $file_path"
}

# Main
detect_architecture
mkdir -p build
download_and_verify build
```

### Multi-binary verification (Node.js example)

```bash
# Fetch expected hash from official SHASUMS file
download_nodejs() {
    local version="20.18.1"
    local arch_name="x64"  # or arm64
    local tarball="node-v${version}-linux-${arch_name}.tar.xz"
    local url="https://nodejs.org/dist/v${version}/${tarball}"
    local shasums_url="https://nodejs.org/dist/v${version}/SHASUMS256.txt"

    wget -O "$tarball" "$url"

    # Extract the expected hash for this specific file from the official list
    local expected_hash
    expected_hash=$(wget -qO- "$shasums_url" \
        | grep -F "$tarball" \
        | awk '{print $1}') || true

    if ! verify_sha256 "$tarball" "$expected_hash" "Node.js ${version}"; then
        exit 1
    fi
}
```

## Why this works

### `read -r actual_hash _ < <(sha256sum "$file_path")`

`sha256sum` outputs `<hash>  <filename>`. Using `read -r actual_hash _` captures the hash into `actual_hash` and discards the filename with `_`. This is more robust than `awk '{print $1}'` for this specific case and avoids a subshell.

### Empty hash = warn and skip (not error)

In a build pipeline that auto-updates download URLs, there may be a brief window where the URL is updated but the expected hash is not yet known (e.g., the hash is fetched from an external source that is temporarily unavailable). Returning success with a warning when `expected_hash` is empty allows the build to proceed with a softer guarantee, while still alerting the operator via stderr.

### Show both expected and actual on mismatch

When a mismatch occurs, printing both values side-by-side allows the operator to:
1. Immediately identify whether the expected hash or the actual file is wrong.
2. Update the expected hash in the config if the upstream released a new binary with the same version number.
3. Detect a supply-chain attack by comparing to official checksums from a separate source.

### Remove file on mismatch

Removing the corrupted (or tampered) file on mismatch prevents a subsequent invocation from accidentally using the bad file (e.g., if `perform_cleanup=false`). This is defense-in-depth.

### Per-architecture hash in `detect_architecture`

Each architecture has a separate binary with a separate SHA-256. Storing them alongside the download URL in the architecture detection function means the hash is always correctly associated with the URL. There is no risk of using the amd64 hash to verify an arm64 binary.

## Pitfalls

- **SHA-256 is not authenticated** — SHA-256 verifies integrity (no corruption, no tampering) but not authenticity (the file came from the expected publisher). For authenticated downloads, use GPG signature verification in addition to SHA-256.
- **`sha256sum` availability** — `sha256sum` is part of GNU coreutils and is present on all Debian/RPM/NixOS systems. On macOS, use `shasum -a 256`. Consider a portability wrapper if your build script must run on macOS.
- **Hash must be stored securely** — if the expected hash is stored in the same repository as the download URL, an attacker who can modify the repository can change both. For high-security use, store the expected hash out-of-band (e.g., in a separate system, a hardware-backed secret, or derived from a signed manifest).
- **Lowercase hex only** — `sha256sum` outputs lowercase hex. If your expected hash contains uppercase letters, the `!=` comparison will fail. Normalize expected hashes to lowercase.
- **`wget -O -` vs redirect** — some CDN URLs redirect. `wget -O file url` follows redirects by default (`--max-redirect=20`). If the redirect changes the final URL, the download still works. The hash check is on the final file content, not the URL.

## Source reference

`build.sh` — `verify_sha256()` function and `download_claude_installer()` function
