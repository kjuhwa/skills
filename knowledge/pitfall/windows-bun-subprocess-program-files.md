---
version: 0.1.0-draft
name: windows-bun-subprocess-program-files
summary: Bun subprocess spawned by an Electron app installed in Program Files can't read/write because of Windows permissions — solved by NSIS oneClick+perMachine:false to install per-user to LOCALAPPDATA.
category: pitfall
tags: [windows, electron, bun, nsis, permissions]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: apps/electron/electron-builder.yml
imported_at: 2026-04-18T00:00:00Z
---

# Windows Program Files + Bun subprocess = broken Bash tool

### The issue
Electron apps on Windows historically install to `C:\Program Files\<appname>\`. That directory is writable only by admin. Anything the app spawns inherits that working dir / file permissions context.

Craft Agents runs a Bun subprocess for the Claude Agent SDK's `Bash` tool. Bun as a subprocess launched from a Program Files install:
- Cannot write to `./` relative to its install path (permission denied).
- Cannot create temp files in some contexts.
- Claude Agent SDK's internal workspace mutations fail silently.
- User sees "the bash tool doesn't work" in the UI with no useful diagnostic.

### The fix in electron-builder.yml
```yaml
nsis:
  oneClick: true
  perMachine: false           # <-- per-user install
  deleteAppDataOnUninstall: true
```

This installs to `%LOCALAPPDATA%\Programs\Craft Agents\` which is always writable by the installing user. Bun subprocess inherits a writable context.

### Trade-offs
- Every Windows user on a shared machine installs separately (no system-wide install).
- Auto-updates are per-user, not triggered by sysadmins.
- For enterprise deployments that REQUIRE perMachine, you'd need a separate install config with documented workarounds (launch with elevated privileges, explicit working-dir override, etc.).

### Symptoms if you ship perMachine=true
- Dev builds work.
- Packaged app on dev's dev machine (usually admin) works.
- Typical user's install — "bash tool broke, but everything else works" with no log output.
- Support hours wasted before someone notices the install path.

### Generalization
Any Electron app that spawns short-lived workers (Bun, Python, custom binaries) that touch the filesystem should assume perMachine=true is hostile. The "bad" path is silent failure, which is the worst DX.

### Reference
- `apps/electron/electron-builder.yml#nsis`.
- Comment in the yml: "Bun subprocess cannot read/write files in Program Files due to Windows permissions."
