---
name: node-pty-native-module-rebuild-nix
description: Rebuild a node-gyp native addon (e.g., node-pty) in a Nix derivation using buildNpmPackage. Handle the fsevents macOS-only optional dep by stripping it from package-lock.json in postPatch. Explicitly copy the native build/ directory in postInstall since npmInstallHook skips it.
category: nix
version: 1.0.0
tags: [nix, node-gyp, native-addon, node-pty, npm, fsevents, nixos]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# Node-gyp Native Addon Rebuild in Nix (node-pty Pattern)

## When to use

Use this pattern when:
- You need to package a Node.js native addon (`.node` file built via `node-gyp`) in a Nix derivation.
- The addon's `package-lock.json` references macOS-only optional dependencies (like `fsevents`) that cause `npm ci` to fail in a Linux Nix sandbox.
- The npm package's `prepublish` or `build` script runs TypeScript compilation but does NOT run `node-gyp rebuild` — you must invoke it separately.
- The standard `npmInstallHook` does not copy the `build/` directory containing the compiled `.node` file.

## Pattern

### Key issues to address

1. `fsevents` is in the lock file as an optional dep but only exists on macOS. Remove it from `package-lock.json` in `postPatch` so `npm ci` does not fail on Linux.
2. The `buildPhase` must run both `npm run build` (TypeScript) and `node-gyp rebuild` (native addon). The default `npmBuildHook` only runs `npm run build`.
3. `npmInstallHook` copies the package but NOT the `build/` directory containing the compiled `.node` file. Copy it explicitly in `postInstall`.

## Minimal example

```nix
# nix/my-native-addon.nix
{ lib, buildNpmPackage, fetchFromGitHub, python3, node-gyp }:

buildNpmPackage rec {
  pname = "my-native-addon";
  version = "1.1.0";

  src = fetchFromGitHub {
    owner = "org";
    repo = "my-native-addon";
    rev = "v${version}";
    hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  };

  npmDepsHash = "sha256-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=";

  # python3 and node-gyp are needed for native compilation
  nativeBuildInputs = [ python3 node-gyp ];

  # Remove macOS-only optional dependency from lock file.
  # Without this, npm ci on Linux fails with a lock/json mismatch
  # because fsevents is in the lock file but excluded by the npm
  # deps fetcher (it's macOS-only).
  postPatch = ''
    sed -i '/"fsevents"/d' package-lock.json
  '';

  # Run both the TypeScript build AND native addon build.
  # The default npmBuildHook only runs "npm run build" (tsc).
  buildPhase = ''
    runHook preBuild
    npm run build         # TypeScript compilation
    node-gyp rebuild      # Native addon (.node file)
    runHook postBuild
  '';

  # npmInstallHook copies the npm package contents but NOT build/
  # The compiled .node file lives in build/Release/ and must be
  # copied manually.
  postInstall = ''
    cp -r build $out/lib/node_modules/${pname}/
  '';

  meta = with lib; {
    description = "My native Node.js addon";
    license = licenses.mit;
    platforms = platforms.linux;
  };
}
```

### Using the derivation from the main app

```nix
# In flake.nix or the main derivation:
{ node-pty, ... }:
stdenvNoCC.mkDerivation {
  # Pass node-pty's lib dir to build.sh so it can skip npm install
  buildPhase = ''
    bash build.sh \
      --node-pty-dir "${node-pty}/lib/node_modules/my-native-addon" \
      ...
  '';
  # build.sh copies node_modules/my-native-addon from --node-pty-dir
  # instead of running npm install (which would fail in the Nix sandbox)
}
```

## Why this works

### `fsevents` in `package-lock.json` on Linux

`npm ci` validates that the lock file matches `package.json`. On macOS, `fsevents` is an optional dependency that npm includes in the lock file. On Linux, it is excluded. The lock file is committed with the macOS-generated entry present, so `npm ci` on Linux sees a mismatch and fails. `sed -i '/"fsevents"/d' package-lock.json` in `postPatch` removes all lines containing `"fsevents"` from the lock file, restoring consistency.

### Separate `npm run build` and `node-gyp rebuild`

Most native addon packages separate TypeScript compilation (`npm run build`) from native addon compilation (`node-gyp rebuild`). The `npm run build` script typically produces `.js` files in `lib/`. The native addon requires running `node-gyp rebuild` explicitly. In a Nix derivation, both must be invoked explicitly in `buildPhase` because the default hook only knows about the npm script.

### `postInstall` to copy `build/`

`npmInstallHook` calls `npm install --ignore-scripts --no-package-lock` to produce the output. This copies the package's source and TypeScript output but NOT the `build/` directory, which is in `.gitignore` and is a build artifact. The compiled `.node` file (e.g., `build/Release/pty.node`) lives in `build/` and must be copied explicitly in `postInstall` so downstream consumers can find it.

### `--node-pty-dir` flag in build script

Rather than running `npm install` inside the Nix sandbox (which has no network access), the main derivation's `buildPhase` passes the pre-built addon directory to the build script via a flag. The build script copies the pre-built `node_modules/my-native-addon` into the staging directory instead of fetching it from npm.

## Pitfalls

- **`npmDepsHash` must match the modified lock file** — if you run `sed` in `postPatch`, the `npmDepsHash` in the derivation must be computed from the MODIFIED lock file (as Nix sees it after patching). Recompute with `nix-prefetch-github` or `nix hash path` after testing the derivation.
- **`node-gyp` version compatibility** — `node-gyp` requires a matching Python version. Pass `python3` (not `python`) in `nativeBuildInputs`; `python` is Python 2 in some nixpkgs versions.
- **`node-gyp rebuild` uses the Node.js version from nixpkgs** — ensure the Node.js version in `nativeBuildInputs` matches the version the addon targets. Version mismatches produce binaries that fail to load with `NODE_MODULE_VERSION` errors.
- **ABI mismatch with the app's bundled Electron** — if the main app bundles its own Electron, native addons must be compiled against the Electron Node.js ABI version, not the system Node.js. Use `electron.headers` or a similar mechanism for electron-native addons. `node-pty` is typically not electron-specific, but check the addon's documentation.
- **`platforms = platforms.linux`** — native addons built in this pattern are Linux-only. Add appropriate `platforms` metadata to prevent accidental use on macOS or other systems.

## Source reference

`nix/node-pty.nix` — full derivation for node-pty native addon
