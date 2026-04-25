---
version: 0.1.0-draft
name: nix-store-resource-path-immutability
summary: The Nix store is read-only and `/proc/self/exe` resolves through symlinks to the real binary location, so Electron's `process.resourcesPath` points at the wrong tree when the binary and application resources live in different store paths.
category: nix
tags: [nix, nixos, electron, resource-path, proc-self-exe, symlink, store]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# Nix Store Resource Path Immutability

## Context

Packaging an Electron application for NixOS typically reuses the system-level
`electron` derivation rather than bundling a private copy. The `electron`
package lives in the Nix store at its own content-addressed path (e.g.,
`/nix/store/<hash>-electron-<version>/`). The packaged app's resources
(`.asar`, tray icons, locale JSON files) live in a separate derivation output
at a different path.

This is the correct Nix way to avoid duplication, but it creates a subtle
runtime problem.

## Observation

Electron computes `process.resourcesPath` at startup by resolving
`/proc/self/exe`, walking any symlinks to the real ELF binary, and returning
the `resources/` subdirectory of that binary's parent directory.

On NixOS, the binary launcher wrapper is a bash script that `exec`s the real
ELF. The ELF lives in the `electron-unwrapped` store path. So
`process.resourcesPath` always resolves to
`/nix/store/<hash>-electron-unwrapped-<version>/libexec/electron/resources/`,
which contains only Electron's own built-in `default_app.asar` — not the
application's `app.asar`, locale JSON files, or tray icons.

Trying to correct this with a symlink from the Electron resources directory to
the app's resources also fails: the Nix store is globally read-only, and
`ln -s` into an existing store path is impossible at install or activation time.

Additionally, when `ELECTRON_FORCE_IS_PACKAGED=true` is set, the app reads
locale JSON (`en-US.json`) from `resourcesPath` at module-load time — before
any JavaScript preload wrapper has a chance to correct the path — resulting in
an `ENOENT` crash.

## Why it happens

Linux's `/proc/self/exe` returns the real path of the executable after
resolving all symlinks (via `readlink -f` semantics). Wrapper scripts that
`exec` a binary do not change the identity of the resulting process's
`/proc/self/exe`; that still points at the ELF the kernel actually mapped.

The Nix store is implemented as a content-addressed, append-only tree mounted
read-only. Once a derivation is built and registered, nothing can be written
into its paths. This prevents both runtime mutation and post-build symlinking
into existing store paths.

## Practical implication

The solution is to **copy the Electron ELF binary into your own derivation
output tree** and symlink everything else from the upstream Electron package.
This one real copy changes what `/proc/self/exe` resolves to, making
`process.resourcesPath` point at your tree where you can place all app
resources:

```nix
# In the installPhase of your derivation:
electron_tree=$out/lib/my-app/electron

# MUST be a real copy — not a symlink — so /proc/self/exe resolves here
cp ${electronDir}/electron $electron_tree/electron

# Symlink everything else to avoid duplicating hundreds of MB
for item in ${electronDir}/*; do
  name=$(basename "$item")
  [[ "$name" = "electron" ]] && continue
  [[ "$name" = "resources" ]] && continue
  ln -s "$item" "$electron_tree/$name"
done

# Merge Electron's resources/ and your app's resources/
for item in ${electronDir}/resources/*; do
  ln -s "$item" "$electron_tree/resources/$(basename "$item")"
done
cp my-app.asar $electron_tree/resources/
cp -r my-app.asar.unpacked $electron_tree/resources/
```

Then create a launcher wrapper that replicates the upstream `electron` wrapper's
env setup (GIO modules, GDK pixbuf, XDG data dirs, chrome-sandbox path) but
`exec`s `$electron_tree/electron` as the final step.

A JavaScript preload wrapper (`__dirname`-based fallback) can also correct
`process.resourcesPath` at runtime for cases where resources are loaded lazily,
as a belt-and-suspenders measure.

## Source reference

- `nix/claude-desktop.nix`: `installPhase` — explicit comment "MUST be a real
  copy (not symlink) so that /proc/self/exe resolves to our tree" with the
  full copy+symlink pattern.
- `scripts/frame-fix-wrapper.js`: `derivedResourcesPath = path.dirname(__dirname)`
  — runtime correction as belt-and-suspenders.
