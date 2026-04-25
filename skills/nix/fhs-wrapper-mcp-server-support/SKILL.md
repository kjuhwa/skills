---
name: fhs-wrapper-mcp-server-support
description: Wrap a NixOS application derivation in buildFHSEnv to provide a FHS-compliant filesystem view. Enables subprocess execution of dynamically linked native binaries (like MCP servers) that expect /usr, /lib, /bin at standard paths.
category: nix
version: 1.0.0
tags: [nix, nixos, fhs, buildFHSEnv, mcp, subprocess, native-binaries]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# FHS Wrapper for Subprocess/MCP Server Support on NixOS

## When to use

Use this pattern when:
- Your NixOS application spawns subprocesses that are not Nix packages (e.g., user-installed MCP servers, Docker-based tools, Python scripts installed with pip, npm binaries).
- Those subprocesses are dynamically linked and expect FHS paths (`/usr/lib`, `/usr/bin`, `/lib/x86_64-linux-gnu`, etc.).
- The base application works fine on NixOS but subprocess execution fails with "No such file or directory" for dynamic linkers or shared libraries.
- You want to offer two install options: one without FHS (for pure NixOS users) and one with FHS (for users who need subprocess compatibility).

## Pattern

```nix
# Two derivations exposed from the flake:
# 1. myapp           — pure Nix derivation, no FHS
# 2. myapp-fhs      — same app wrapped in buildFHSEnv
```

The FHS derivation adds target packages (Node.js, Docker, OpenSSL, glibc, etc.) that cover common MCP server requirements. The `runScript` points at the original application's launch script.

## Minimal example

```nix
# nix/fhs.nix
{
  buildFHSEnv,
  myapp,
  nodejs,
  docker,
  docker-compose,
  openssl,
  glibc,
  # Add other packages that your subprocesses may need
  python3,
  git,
}:
buildFHSEnv {
  name = "myapp";

  targetPkgs = pkgs: [
    myapp          # the actual application
    # Commonly needed by subprocesses / MCP servers:
    nodejs
    python3
    git
    docker
    docker-compose
    glibc
    openssl
  ];

  # The FHS environment executes this script as the entry point
  runScript = "${myapp}/bin/myapp";

  # Copy desktop integration files into the FHS output
  extraInstallCommands = ''
    mkdir -p $out/share/applications
    cp ${myapp}/share/applications/* $out/share/applications/

    mkdir -p $out/share/icons
    cp -r ${myapp}/share/icons/* $out/share/icons/
  '';

  meta = myapp.meta // {
    description = "${myapp.meta.description} (FHS environment for native subprocesses)";
  };
}
```

```nix
# flake.nix — expose both variants
{
  outputs = { nixpkgs, ... }@inputs: {
    packages.x86_64-linux = let
      pkgs = nixpkgs.legacyPackages.x86_64-linux;
    in rec {
      myapp = pkgs.callPackage ./nix/myapp.nix { };
      myapp-fhs = pkgs.callPackage ./nix/fhs.nix { inherit myapp; };
      default = myapp;
    };

    overlays.default = final: prev: {
      myapp     = final.callPackage ./nix/myapp.nix { };
      myapp-fhs = final.callPackage ./nix/fhs.nix { myapp = final.myapp; };
    };
  };
}
```

```bash
# Install the FHS variant (enables MCP servers / native subprocesses)
nix profile install github:org/repo#myapp-fhs

# Or install the standard variant (pure Nix, no FHS overhead)
nix profile install github:org/repo
```

## Why this works

### NixOS and the FHS

NixOS does not have `/usr/bin`, `/usr/lib`, or `/lib/x86_64-linux-gnu`. All packages live in `/nix/store/`. Native binaries that were compiled on a standard Linux distribution (expecting FHS paths) will fail with "No such file or directory" for their dynamic linker (`/lib64/ld-linux-x86-64.so.2`).

`buildFHSEnv` creates a lightweight chroot (using Linux user namespaces and bind mounts) that provides a FHS-like filesystem view. Inside this view, `/usr`, `/lib`, `/bin`, etc. are populated with the specified packages. Subprocesses that exec inside the FHS environment can find their dynamic linker and shared libraries.

### Two-derivation pattern: standard + FHS

The FHS variant is an explicit opt-in because:
1. `buildFHSEnv` has overhead (namespace setup at launch time).
2. Pure NixOS users who only use Nix-packaged subprocesses don't need it.
3. It is heavier to build (more packages in `targetPkgs`).

Exposing both `myapp` (default) and `myapp-fhs` gives users the choice.

### `runScript` is the original app's binary

The FHS environment sets up the chroot and then execs `runScript`. By pointing at the original derivation's binary, you avoid duplicating the app's launch logic. The app runs inside the FHS environment, so any subprocesses it spawns also run inside the FHS environment.

### `extraInstallCommands` for desktop integration

`buildFHSEnv` creates a new output at `$out`. Desktop files and icons from the wrapped app need to be copied to the FHS output's `$out/share/` for the desktop environment to find them. Without this, the app's icon and `.desktop` entry may be missing from the FHS variant.

### `meta` inheritance

Using `myapp.meta //` preserves all metadata from the original derivation (license, platforms, homepage) and overrides only the description. This ensures the FHS variant appears correctly in Nixpkgs tooling.

## Pitfalls

- **`buildFHSEnv` does not help with setuid binaries** — the FHS chroot is a user namespace, not a real chroot. Setuid binaries (like `sudo`) cannot be run inside it.
- **Container tools (Docker) require extra setup** — running Docker inside `buildFHSEnv` requires the host to have the Docker daemon running and the user to be in the `docker` group. Adding `docker` to `targetPkgs` makes the CLI available but does not start a new daemon.
- **Do not use `buildFHSEnv` as the `default` package** — some NixOS module system integrations (e.g., `environment.systemPackages`) handle `buildFHSEnv` outputs differently. Keep the standard derivation as `default`.
- **Package list in `targetPkgs` grows with user needs** — be conservative. Adding too many packages increases sandbox setup time and derivation size. Only include packages that are known to be needed by common subprocesses.
- **`extraInstallCommands` uses `$out`** — in `buildFHSEnv`, `$out` refers to the FHS environment's output, not the wrapped app's output. Use `${myapp}/share/...` (with the Nix path) to reference the original app's files.

## Source reference

`nix/fhs.nix` — full implementation
