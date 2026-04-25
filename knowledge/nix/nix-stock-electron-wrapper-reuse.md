---
version: 0.1.0-draft
name: nix-stock-electron-wrapper-reuse
summary: The nixpkgs `electron` package is a `makeWrapper` bash script that sets `GIO_EXTRA_MODULES`, `GDK_PIXBUF_MODULE_FILE`, `XDG_DATA_DIRS`, and `CHROME_DEVEL_SANDBOX`; when building a custom Electron tree, reuse its env setup by copying all but the final `exec` line and appending your own exec.
category: nix
tags: [nix, nixos, electron, wrapper, makeWrapper, GIO, GDK_PIXBUF, environment]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: medium
---

# Nix Stock Electron Wrapper Reuse

## Context

On NixOS, the `electron` package in nixpkgs is not the raw ELF binary. It is a
`makeWrapper`-generated bash script that:
1. Sets environment variables required for GTK/GIO integration.
2. Resolves paths to GLib IO modules, GDK pixbuf loaders, and XDG data dirs
   from the Nix store.
3. Executes the real `electron` ELF binary as its final action.

When you need to package an Electron app with a custom binary tree (e.g., to
fix `process.resourcesPath` — see `nix-store-resource-path-immutability`),
you create your own launcher script. If you skip the env setup from the stock
wrapper, GTK rendering breaks, icons fail to load, and theming is absent.

## Observation

The nixpkgs electron wrapper sets at minimum:
- `GIO_EXTRA_MODULES` — path to GLib I/O modules (needed for network stack,
  GVFS, etc.)
- `GDK_PIXBUF_MODULE_FILE` — path to the GDK pixbuf loaders cache (needed for
  image loading in GTK widgets)
- `XDG_DATA_DIRS` — merged list of data directories for icon themes, MIME types
- `CHROME_DEVEL_SANDBOX` — path to the `chrome-sandbox` binary (Electron reads
  this env var to locate the sandbox)

These paths are all Nix store paths that change with each nixpkgs revision.
Hard-coding them in your derivation would require updating them on every
nixpkgs update.

## Why it happens

NixOS does not have a global `/usr/lib` or `/usr/share`. Every library and
data file lives in a content-addressed store path. The `makeWrapper` tool
generates a shell script that embeds the current store paths as env vars
that the wrapped binary reads at startup.

The stock electron wrapper's env setup is the canonical source of these paths
for a given nixpkgs revision. Reusing it ensures your app gets the same
GTK/GIO configuration as any other Electron app on that system.

## Practical implication

Copy the stock wrapper's content minus its last line, then append your own
`exec` line pointing at your custom binary:

```bash
# In installPhase — after creating $electron_tree:

# Extract everything except the final exec line from the stock wrapper
head -n -1 ${electron}/bin/electron > $electron_tree/electron-wrapper

# Append our own exec pointing at our custom binary (not the stock ELF)
echo "exec \"$electron_tree/electron\" \"\$@\"" >> $electron_tree/electron-wrapper
chmod +x $electron_tree/electron-wrapper
```

Then fix the `CHROME_DEVEL_SANDBOX` path (the stock wrapper points it at the
stock electron binary; ours lives in a different path):

```bash
substituteInPlace $electron_tree/electron-wrapper \
  --replace-quiet "${electron}/libexec/electron/chrome-sandbox" \
    "$electron_tree/chrome-sandbox"
```

Use `electron-wrapper` as the exec target in the launcher script, not
`$electron_tree/electron` directly. This preserves all GTK/GIO env setup
from the nixpkgs wrapper while redirecting the final exec to your binary.

This approach is robust across nixpkgs updates: as long as the stock wrapper
exists and ends with a single `exec` line, the `head -n -1` trick works.
If the wrapper format ever changes, the error will be obvious (missing env
vars or broken exec).

## Source reference

- `nix/claude-desktop.nix`: `installPhase` — `head -n -1 ${electron}/bin/electron`
  pattern with the `CHROME_DEVEL_SANDBOX` substituteInPlace step.
- Comment in that section: "replicates the env setup from the stock electron
  wrapper (GIO, GTK, GDK_PIXBUF, XDG_DATA_DIRS) but execs our custom binary."
