---
name: nix-electron-resource-path-copy
description: Copy the Electron ELF binary (not symlink) into a custom derivation tree so /proc/self/exe resolves to your tree. Merge app resources and Electron resources into one resources/ directory. Preserve the stock Electron wrapper for environment setup.
category: nix
version: 1.0.0
tags: [nix, nixos, electron, resourcesPath, proc-self-exe, packaging, flake]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# Nix Electron Resource Path Copy

## When to use

Use this pattern when packaging an Electron application as a Nix derivation and:
- The app reads files from `process.resourcesPath` at module init time (before any wrapper code can correct it).
- You are using the nixpkgs `electron` package as a separate input (not bundled into the derivation).
- Simple `makeWrapper electron --add-flags app.asar` approaches do not work because `process.resourcesPath` resolves to the wrong store path.

## Pattern

### Why the problem occurs

On NixOS, `electron` and your app live in separate Nix store paths. Chromium computes `process.resourcesPath` from `/proc/self/exe`, which resolves symlinks to the actual ELF binary in `electron-unwrapped`'s store path. So `process.resourcesPath` always points to the Electron package's `resources/` directory — not your app's resources.

**`/proc/self/exe` follows symlinks.** `symlinkJoin`, `wrapProgram`, and similar approaches do not work because the kernel resolves the chain to the real ELF. The only solution is a real copy of the ELF binary into your derivation's tree.

### Solution: custom Electron tree

```
$out/lib/my-app/electron/
  electron            ← real ELF copy (makes /proc/self/exe resolve here)
  electron-wrapper    ← adapted from stock wrapper (keeps GIO/GTK env setup)
  chrome-sandbox      ← symlink to electron-unwrapped
  *.pak, locales/     ← symlinks to electron-unwrapped
  resources/
    default_app.asar  ← symlink from electron-unwrapped/resources/
    app.asar          ← copied from your build
    app.asar.unpacked/← copied from your build
    *.png, *.json     ← app-specific resources
```

## Minimal example

```nix
# nix/my-app.nix
{ lib, stdenvNoCC, fetchurl, electron, nodejs, asar, p7zip, ... }:
let
  electronUnwrapped = electron.passthru.unwrapped or electron;
  electronDir = "${electronUnwrapped}/libexec/electron";
in
stdenvNoCC.mkDerivation {
  pname = "my-electron-app";
  version = "1.0.0";

  # ... src, nativeBuildInputs, buildPhase ...

  installPhase = ''
    runHook preInstall

    #=======================================================
    # Build a custom Electron tree so /proc/self/exe resolves here
    #=======================================================
    electron_tree=$out/lib/my-app/electron

    mkdir -p $electron_tree/resources

    # MUST be a real copy — symlink would resolve to electron-unwrapped
    cp ${electronDir}/electron $electron_tree/electron

    # Symlink everything else (pak files, locales, chrome-sandbox, etc.)
    for item in ${electronDir}/*; do
      name=$(basename "$item")
      [[ "$name" = "electron" ]] && continue   # already copied
      [[ "$name" = "resources" ]] && continue  # handled below
      ln -s "$item" "$electron_tree/$name"
    done

    # Populate resources/ — start with Electron's own resources
    for item in ${electronDir}/resources/*; do
      ln -s "$item" "$electron_tree/resources/$(basename "$item")"
    done

    # Install app resources into the merged tree
    cp build/electron-app/app.asar                $electron_tree/resources/
    cp -r build/electron-app/app.asar.unpacked    $electron_tree/resources/
    # Copy any additional app-specific resources
    for res in build/electron-app/extra-resources/*; do
      [[ -f "$res" ]] && cp "$res" $electron_tree/resources/
    done

    # Build a custom electron-wrapper that points at our tree.
    # Copy all lines EXCEPT the final exec from the stock wrapper,
    # then append our own exec line.
    head -n -1 ${electron}/bin/electron > $electron_tree/electron-wrapper
    echo "exec \"$electron_tree/electron\" \"\$@\"" >> $electron_tree/electron-wrapper
    chmod +x $electron_tree/electron-wrapper

    # Fix CHROME_DEVEL_SANDBOX path to point to our tree
    substituteInPlace $electron_tree/electron-wrapper \
      --replace-quiet "${electron}/libexec/electron/chrome-sandbox" \
                      "$electron_tree/chrome-sandbox"

    #=======================================================
    # Standard install: launcher, icons, desktop file
    #=======================================================
    mkdir -p $out/bin
    cat > $out/bin/my-app << LAUNCHER
#!/usr/bin/env bash
electron_exec="$electron_tree/electron-wrapper"
app_path="$electron_tree/resources/app.asar"
exec "\$electron_exec" "\$app_path" "\$@"
LAUNCHER
    chmod +x $out/bin/my-app

    runHook postInstall
  '';
}
```

## Why this works

### `/proc/self/exe` resolves symlinks at the kernel level

The Linux kernel resolves `/proc/self/exe` to the real path of the executing ELF binary by following all symlinks. There is no way to intercept this from userspace. The only way to make `process.resourcesPath` point to your derivation is to place the actual ELF binary in your derivation's directory tree.

### `symlinkJoin` and `wrapProgram` do not work

`symlinkJoin` creates symlinks; `wrapProgram` creates a wrapper script that calls the original binary. In both cases, `/proc/self/exe` resolves to the electron-unwrapped ELF in its original store path, so `resourcesPath` still points there.

### Reuse the stock wrapper for environment setup

The nixpkgs `electron` wrapper sets up GIO plugin paths, GTK pixel buffer module files, XDG data directories, and `CHROME_DEVEL_SANDBOX`. These environment variables are required for correct rendering and sandbox operation. Copying all lines except the final `exec` line preserves this setup. The `CHROME_DEVEL_SANDBOX` path must be updated to point to your tree's `chrome-sandbox` (which is symlinked to electron-unwrapped, so it still gets the correct binary).

### Symlink non-ELF files to avoid duplication

`.pak` files, `locales/`, and `chrome-sandbox` can be symlinked because they are referenced by path at runtime. Only the main ELF binary needs to be a real copy for `/proc/self/exe` purposes.

### `resources/` merge: Electron's + app's

The merged `resources/` directory must contain both Electron's own files (like `default_app.asar`, which Electron reads at startup) and your app's files (`app.asar`, locale JSONs, tray icons). Starting with symlinks from Electron's resources and then copying app-specific files achieves this without duplication.

## Pitfalls

- **`electron.passthru.unwrapped` may not exist in all nixpkgs versions** — use `electron.passthru.unwrapped or electron` to fall back gracefully. Test with the specific nixpkgs version you pin.
- **`electronDir` path varies by nixpkgs architecture** — on `x86_64-linux`, it is typically `/nix/store/.../libexec/electron`. Always derive from `${electronUnwrapped}/libexec/electron` rather than hardcoding.
- **`substituteInPlace` requires `--replace-quiet` for optional replacements** — if the string to replace is not found, `substituteInPlace` fails without `--replace-quiet`. Use `--replace-fail` only when you are certain the pattern is present.
- **`head -n -1` portability** — `head -n -1` prints all but the last line on GNU coreutils. On BSD/macOS `head`, use `head -n $(( $(wc -l < file) - 1 )) file`. In a Nix derivation, GNU coreutils is always available.
- **Nix store is read-only after build** — you cannot modify the derivation output at runtime. All file layout decisions must happen in `installPhase`. Plan the resource directory structure carefully before building.

## Source reference

`nix/claude-desktop.nix` — `installPhase` electron_tree construction; `docs/learnings/nix.md` — root cause analysis and rationale
