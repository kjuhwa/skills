---
name: dev-sidecar-placeholder-binary
description: Satisfy Tauri's build-time sidecar requirement in dev mode by emitting a minimal valid PE / shell-script placeholder.
category: tauri
version: 1.0.0
version_origin: extracted
tags: [tauri, dev-experience, placeholder-binary, windows-pe, cross-platform]
source_type: extracted-from-git
source_url: https://github.com/jamiepine/voicebox.git
source_ref: main
source_commit: 476abe07fc2c1587f4b3e3916134018ebacd143d
source_project: voicebox
confidence: medium
imported_at: 2026-04-18T00:00:00Z
---

# Dev sidecar placeholder binary

## When to use
Tauri verifies sidecar binaries at compile time. In dev you want to run the backend manually (with hot-reload) but the missing sidecar breaks `tauri dev`. You need a byte-cheap placeholder that's just valid enough to pass Tauri's check without shipping anything that could be mistaken for the real server.

## Steps
1. Detect the current target triple via `rustc --print host-tuple`. Fall back to `process.platform` + `process.arch` heuristics if Rust is not installed. Target triples look like `x86_64-pc-windows-msvc`, `aarch64-apple-darwin`, `x86_64-unknown-linux-gnu`.
2. Skip if a real binary already exists. Use a size threshold (e.g. `>10000 bytes`) to distinguish the placeholder from the real 100+ MB sidecar, so the script is safe to run repeatedly.
3. On Unix, write a tiny shell script that `echo`s a "start the real server with `bun run dev:server`" message and exits 1. `chmod 0o755` it.
4. On Windows, emit a valid minimal PE. The absolute minimum PE requires: DOS header (MZ), a DOS stub, PE signature, COFF header (Machine=x86_64, 1 section), a PE32+ optional header, padded to a 512-byte file alignment. Embed the bytes in your script; don't shell out to `link.exe`.
5. On the Tauri side, when `rx.recv()` returns `None` in dev (placeholder process exited), don't treat it as an error — probe port 17493 and, if a manually-started server is listening, reuse it. Print clear guidance to start the real server if not.
6. Wire the generator into the monorepo's setup command (e.g. `bun run setup:dev` or `just _ensure-sidecar`) so contributors never see the Tauri error.

## Counter / Caveats
- Do NOT ship the placeholder to end users. Filter `src-tauri/binaries/` by size in your release script to catch accidents.
- The minimum PE is sensitive to byte layout; test on actual Windows before relying on it. If Windows refuses to load it, the contributor sees `ERROR_BAD_EXE_FORMAT` and is confused.
- Watch the binary-name convention: `voicebox-server-<target-triple>` with `.exe` on Windows. Tauri requires the exact name per platform.
- Keep the placeholder exit code non-zero so Tauri reports the intentional failure; dev-mode detection branches on that.

Source references: `scripts/setup-dev-sidecar.js`, `tauri/src-tauri/src/main.rs` (dev-mode branches in `start_server`).
