---
name: reject-insecure-bind-without-tls
description: Refuse to bind a token-authenticated WebSocket/HTTP server to a non-loopback address unless TLS is configured, with an explicit --allow-insecure-bind escape hatch.
category: security
version: 1.0.0
version_origin: extracted
tags: [websocket, tls, tokens, bind-safety]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/server/src/index.ts
imported_at: 2026-04-18T00:00:00Z
---

# Reject insecure network bind without TLS

## When to use
- Any server that carries a bearer token or session cookie over TCP (headless RPC, admin UI, etc.).
- You expect most users to run on `127.0.0.1` but some will want remote access.
- Want secure-by-default: users only hit the insecure path if they *explicitly* acknowledge.

## How it works
1. After successfully starting the listener, check:
   ```ts
   const isLocalBind = host === '127.0.0.1' || host === 'localhost' || host === '::1';
   if (!isLocalBind && protocol === 'ws') { /* insecure */ }
   ```
2. If insecure, look for a CLI escape hatch flag, e.g. `--allow-insecure-bind`.
3. If not granted: print a multi-line actionable error (show TLS env vars, show the override flag), call `await server.stop()`, `process.exit(1)`.
4. If granted: print a warning but continue.
5. Pair with TLS setup: `CRAFT_RPC_TLS_CERT` + `CRAFT_RPC_TLS_KEY` paths are `readFileSync`d and passed to `createHttpsServer({ cert, key, ca? })` before the WebSocket server wraps it.

## Example
```ts
const isLocal = host === '127.0.0.1' || host === 'localhost' || host === '::1';
if (!isLocal && protocol === 'ws') {
  if (!process.argv.includes('--allow-insecure-bind')) {
    console.error(
      '\nRefusing to bind to a network address without TLS.\n' +
      '  1. Set CRAFT_RPC_TLS_CERT and CRAFT_RPC_TLS_KEY to enable wss://\n' +
      '  2. Pass --allow-insecure-bind to override (NOT recommended)\n');
    await instance.stop(); process.exit(1);
  }
  console.warn('WARNING: binding to a network address without TLS; tokens in cleartext.');
}
```

## Gotchas
- Don't just warn and keep going - users will never read warnings and production will end up in plaintext.
- `--allow-insecure-bind` is strictly better than an env var because it has to be typed for every run.
- Consider also rejecting `0.0.0.0` without TLS even in Docker - set the env variable `CRAFT_RPC_HOST=0.0.0.0` as a default ONLY in Docker where the container network is the isolation boundary.
- Show the user HOW to fix it (env vars, script path) in the error message, not just what's wrong.
