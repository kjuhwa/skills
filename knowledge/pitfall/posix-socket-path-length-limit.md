---
version: 0.1.0-draft
name: posix-socket-path-length-limit
summary: POSIX Unix domain socket paths are capped at around 104 characters on macOS (108 on Linux), so daemons that naively drop a socket under `~/Library/Application Support/...` silently fail to bind. Use `XDG_RUNTIME_DIR` or `/tmp` with uid-suffixed names instead.
category: pitfall
confidence: high
tags: [unix-socket, macos, path-length, daemon, ipc]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/daemon/utils.ts
imported_at: 2026-04-18T00:00:00Z
---

# POSIX Socket Path Length Limit

## Context

When you design a daemon that listens on a Unix domain socket, your instinct is to put the socket alongside other per-app state, e.g. `~/Library/Application Support/myapp/daemon.sock` on macOS. This fails mysteriously: the socket doesn't bind, the client can't connect, and the error is often truncated to "ENAMETOOLONG" or "address not available".

## The fact / decision / pitfall

macOS caps `sockaddr_un.sun_path` at **104 characters including the NUL**; Linux at 108. Full absolute paths are what's counted, so a path like:

```
/Users/someuser/Library/Application Support/chrome-devtools-mcp/server.sock
```

is already 75 chars before your user has a long username. Homebrew's Python, multi-word usernames, or nested app directories will push you over quickly.

Correct approach:

- If `process.env.XDG_RUNTIME_DIR` is set (Linux standard, sometimes macOS), use `$XDG_RUNTIME_DIR/myapp/server.sock`.
- Otherwise on macOS/Linux, use `/tmp/myapp-${uid}.sock`. `/tmp` is cleared on boot, short, and uid-suffixed avoids collisions in shared-tenancy environments.
- On Windows, use Named Pipes instead: `path.join('\\\\.\\pipe', APP_NAME, 'server.sock')`. Windows named pipes have a completely different namespace and a much more generous length.

## Evidence

- `src/daemon/utils.ts::getSocketPath()` explicitly comments: "We use /tmp/ because it is much shorter than ~/Library/Application Support/ and keeps us well under the 104-character limit."
- The same file uses `path.join('\\\\.\\pipe', APP_NAME, 'server.sock')` on Windows.
- `chrome://inspect` / Chrome's own DevTools pipes also live under `/tmp` on macOS for this reason.

## Implications

- Never share code paths between "where do I put sockets" and "where do I put logs/state" — they have different length constraints. Logs can live under `~/Library/Application Support`; sockets can't.
- Test with a long username and a path-heavy CI container. The bug is invisible until it fires.
- PID files and log files should *not* live next to the socket just because the socket location was forced short — keep runtime (socket) vs. persistent (state) dirs distinct.
- If you must put the socket elsewhere for isolation reasons, symlinking into `/tmp` is legal and the sender/receiver both see the short name.
