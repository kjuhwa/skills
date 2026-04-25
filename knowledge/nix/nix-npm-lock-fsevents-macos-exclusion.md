---
version: 0.1.0-draft
name: nix-npm-lock-fsevents-macos-exclusion
summary: Nix's `buildNpmPackage` npm-lock fetcher is stricter than `npm ci` and rejects macOS-only `optionalDependencies` like `fsevents` because it attempts to hash them on Linux; strip the reference from `package-lock.json` in `postPatch` to restore determinism.
category: nix
tags: [nix, npm, buildNpmPackage, fsevents, macos, optionalDependencies, package-lock, postPatch]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: medium
---

# Nix npm Lock fsevents macOS Exclusion

## Context

When packaging a Node.js package for NixOS using `buildNpmPackage`, Nix
attempts to pre-fetch all dependencies listed in `package-lock.json` to
populate the Nix store. This includes `optionalDependencies`.

The `fsevents` package is a macOS-only native module (Apple FSEvents API for
file system change notifications). It is listed as an `optionalDependency` in
many packages (including `chokidar`, which is used by build tools). On non-macOS
systems, `npm ci` silently skips `fsevents` because optional dependencies are
allowed to fail installation.

## Observation

Nix's `buildNpmPackage` npm-lock fetcher does not apply the same "optional
means skippable" logic. It tries to fetch and hash `fsevents` because it
appears in the lock file. On Linux:

1. The fetch may fail because `fsevents` is a macOS-binary-only package with no
   Linux tarball.
2. Even if it fetches, the hash stored in `npmDepsHash` will not match what
   the macOS version would produce, causing a hash mismatch.
3. The lock file / package.json inconsistency check fails because Nix sees an
   entry in the lock that cannot be resolved on the current platform.

The result is a build failure that does not happen with a plain `npm ci` on
Linux.

## Why it happens

Nix is designed for bit-for-bit reproducibility. Its npm lock integration
treats the lock file as a definitive manifest of what must be fetched, with
no platform-conditional logic. Optional dependencies are part of the lock file
and are therefore part of the manifest Nix tries to satisfy.

`npm ci` on Linux respects the `os: ['darwin']` field in `fsevents`'s
`package.json` and skips it as an unsatisfied optional dependency. Nix's
fetcher does not implement this platform check.

## Practical implication

Use `postPatch` in the derivation to strip `fsevents` references from
`package-lock.json` before Nix's fetcher reads it:

```nix
buildNpmPackage rec {
  pname = "my-node-package";
  version = "1.1.0";

  # ... src, npmDepsHash, etc.

  postPatch = ''
    # Remove macOS-only fsevents from the lock file.
    # Nix's npm fetcher doesn't handle platform-conditional optional deps
    # the way "npm ci" does, and attempts to fetch fsevents on Linux fail.
    sed -i '/"fsevents"/d' package-lock.json
  '';
}
```

This is safe because:
- `fsevents` is only used on macOS.
- Removing it from the lock file does not affect Linux builds.
- The resulting build is still deterministic (the lock file, minus the
  macOS-only entry, is fully resolved on Linux).

After modifying `postPatch`, you will need to update `npmDepsHash` because the
effective set of fetched dependencies changes. Run `nix build` with a dummy
hash, note the actual hash from the error, and update.

## Source reference

- `nix/node-pty.nix`: `postPatch` — exact one-liner `sed -i '/"fsevents"/d'
  package-lock.json` with the comment "chokidar (dev dep) has an optional dep
  on fsevents (macOS-only). The Nix npm deps fetcher excludes it, so npm ci
  sees a lock/json mismatch. Strip the reference from the lock file to fix the
  sync."
