---
name: unix-socket-length-prefixed-json-rpc
description: Implement length-prefixed JSON RPC over a Unix domain socket at XDG_RUNTIME_DIR. Uses 4-byte big-endian length prefix framing, handles partial reads via buffer accumulation, and supports persistent connections with multiple request/response cycles.
category: ipc
version: 1.0.0
tags: [ipc, unix-socket, json-rpc, framing, nodejs, daemon, xdg-runtime-dir]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# Unix Socket Length-Prefixed JSON RPC

## When to use

Use this pattern when:
- You need bidirectional IPC between a parent application (e.g., Electron renderer) and a local daemon process.
- The transport must work across process boundaries on Linux (no shared memory).
- Messages are JSON objects of variable length.
- You need to handle partial TCP/Unix reads correctly (data arrives in chunks, not whole messages).
- You want to match an existing Windows named-pipe protocol that uses 4-byte length-prefixed framing (making the protocol portable across platforms).

## Pattern

### Protocol

```
Transport:  Unix domain socket at $XDG_RUNTIME_DIR/service.sock
Framing:    4 bytes big-endian uint32 = payload length
            N bytes UTF-8 JSON payload
Direction:  bidirectional (both client and server can send)

Request:    { "id": "<uuid>", "method": "methodName", "params": { ... } }
Response:   { "id": "<same>", "success": true, "result": { ... } }
            { "id": "<same>", "success": false, "error": "message" }
Events:     { "type": "stdout"|"stderr"|"exit"|"error", ... }
```

### Server lifecycle

```
net.createServer → listen on SOCKET_PATH
  on "connection": create per-socket state { buffer: Buffer.alloc(0) }
    socket.on("data"): append to buffer, drain complete messages
      → dispatch to handler → writeMessage(socket, response)
```

## Minimal example

```javascript
// service.js — Unix socket JSON RPC daemon
'use strict';

const net = require('net');
const fs = require('fs');

const SOCKET_PATH = (process.env.XDG_RUNTIME_DIR || '/tmp') + '/my-service.sock';

// ── Framing ────────────────────────────────────────────────────────────────

/**
 * Write a length-prefixed JSON message to a socket.
 * Format: [4 bytes big-endian uint32 length][N bytes UTF-8 JSON]
 */
function writeMessage(socket, message) {
    const json = JSON.stringify(message);
    const jsonBuf = Buffer.from(json, 'utf8');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(jsonBuf.length, 0);
    socket.write(Buffer.concat([lenBuf, jsonBuf]));
}

/**
 * Parse one complete length-prefixed message from a buffer.
 * Returns { message, remaining } if a complete message is available,
 * or null if the buffer does not yet contain a complete message.
 */
function parseMessage(buffer) {
    if (buffer.length < 4) return null;                    // length header incomplete
    const len = buffer.readUInt32BE(0);
    if (buffer.length < 4 + len) return null;              // payload incomplete
    const json = buffer.subarray(4, 4 + len).toString('utf8');
    const remaining = Buffer.from(buffer.subarray(4 + len));
    return { message: JSON.parse(json), remaining };
}

// ── Request Handlers ───────────────────────────────────────────────────────

const handlers = {
    async echo(params) {
        return { echoed: params };
    },
    async getStatus(params) {
        return { running: true, uptime: process.uptime() };
    },
};

async function dispatch(request, socket) {
    const { id, method, params } = request;
    const handler = handlers[method];
    if (!handler) {
        writeMessage(socket, { id, success: false, error: `Unknown method: ${method}` });
        return;
    }
    try {
        const result = await handler(params || {}, socket);
        writeMessage(socket, { id, success: true, result });
    } catch (err) {
        writeMessage(socket, { id, success: false, error: err.message });
    }
}

// ── Server ─────────────────────────────────────────────────────────────────

// Remove stale socket from previous run
if (fs.existsSync(SOCKET_PATH)) {
    fs.unlinkSync(SOCKET_PATH);
}

const server = net.createServer((socket) => {
    let buffer = Buffer.alloc(0);

    socket.on('data', (chunk) => {
        // Accumulate data — TCP/Unix streams can fragment messages
        buffer = Buffer.concat([buffer, chunk]);

        // Drain all complete messages from the buffer
        let parsed;
        while ((parsed = parseMessage(buffer)) !== null) {
            buffer = parsed.remaining;
            dispatch(parsed.message, socket).catch(err => {
                console.error('Dispatch error:', err);
            });
        }
    });

    socket.on('error', (err) => {
        if (err.code !== 'ECONNRESET') {
            console.error('Socket error:', err);
        }
    });

    socket.on('close', () => {
        // Clean up per-connection state if needed
    });
});

server.listen(SOCKET_PATH, () => {
    console.log('Service listening on', SOCKET_PATH);
    // Restrict access to current user only
    fs.chmodSync(SOCKET_PATH, 0o600);
});

// ── Client Example ─────────────────────────────────────────────────────────

// In the Electron app (or any Node.js client):
function createClient(socketPath) {
    return new Promise((resolve, reject) => {
        const socket = net.createConnection(socketPath, () => resolve(socket));
        socket.once('error', reject);
    });
}

async function callMethod(socket, method, params) {
    return new Promise((resolve, reject) => {
        const id = require('crypto').randomUUID();
        let buffer = Buffer.alloc(0);

        const cleanup = () => socket.removeListener('data', onData);

        function onData(chunk) {
            buffer = Buffer.concat([buffer, chunk]);
            let parsed;
            while ((parsed = parseMessage(buffer)) !== null) {
                buffer = parsed.remaining;
                if (parsed.message.id === id) {
                    cleanup();
                    if (parsed.message.success) {
                        resolve(parsed.message.result);
                    } else {
                        reject(new Error(parsed.message.error));
                    }
                }
            }
        }

        socket.on('data', onData);
        writeMessage(socket, { id, method, params });

        // Timeout
        setTimeout(() => {
            cleanup();
            reject(new Error(`RPC timeout: ${method}`));
        }, 30000);
    });
}

// Usage:
// const socket = await createClient(SOCKET_PATH);
// const status = await callMethod(socket, 'getStatus', {});
```

## Why this works

### Length prefix handles stream fragmentation

TCP and Unix sockets are byte streams, not message streams. A single `socket.on('data', ...)` callback may receive half a message, one message, or multiple messages in a single chunk. The 4-byte length prefix encodes exactly how many bytes to expect for the current message. The `parseMessage` function returns `null` when the buffer does not contain a full message, and the `while` loop drains all complete messages from the buffer on each `data` event.

### `Buffer.from(buffer.subarray(4 + len))` creates a new buffer

`Buffer.subarray` returns a view over the original buffer, sharing memory. When data arrives in the next `data` event, `Buffer.concat([buffer, chunk])` would create a new buffer from the view plus new data, which is safe. The explicit `Buffer.from(...)` call creates a copy, preventing long-lived references from holding large buffers in memory.

### `readUInt32BE` for big-endian framing

Big-endian (network byte order) is the conventional choice for wire protocols. It matches the original Windows named-pipe protocol this replaces, enabling cross-platform compatibility: a Windows client and a Linux daemon can speak the same protocol.

### `id` field for response correlation on persistent connections

Unlike HTTP (one request per connection), this protocol supports multiple concurrent in-flight requests over a single persistent connection. The `id` field in both request and response lets clients match responses to requests regardless of order. Use `crypto.randomUUID()` to generate unique IDs.

### `chmod 0o600` on socket

Unix domain sockets support filesystem permissions. Setting the socket to `0o600` (owner read/write only) prevents other users from connecting to the daemon. This is important for single-user service daemons that handle privileged operations.

## Pitfalls

- **Remove stale socket before `server.listen`** — if the previous server process crashed without calling `server.close()`, the socket file persists but nothing is listening. `net.createServer().listen()` will fail with `EADDRINUSE` if the file exists. Always `fs.unlinkSync(SOCKET_PATH)` before listening (check existence first to avoid errors if not present).
- **`XDG_RUNTIME_DIR` may not be set** — `XDG_RUNTIME_DIR` is set by systemd/logind on most modern Linux systems but may be absent in containers or non-systemd environments. Fall back to `/tmp` and use a user-specific filename (e.g., `my-service-${process.uid}.sock`).
- **Message size limit** — `readUInt32BE` supports messages up to 4GB. In practice, very large messages (>100MB) will cause memory pressure. Consider adding a sanity check: `if (len > MAX_MESSAGE_SIZE) { socket.destroy(); return; }`.
- **JSON parse errors** — malformed JSON in the payload will throw. Wrap `JSON.parse` in try/catch and destroy the socket (or send an error response if the message ID was parseable) on invalid JSON.
- **Concurrent message delivery order** — `dispatch()` is async. If two requests arrive simultaneously, their responses may be sent in a different order. This is correct for the `id`-based correlation model, but clients must not assume response order matches request order.
- **`ECONNRESET` is normal** — when a client closes the connection abruptly (e.g., the parent process crashes), the socket will emit `ECONNRESET`. This is expected and should be ignored in the `error` handler.

## Source reference

`scripts/cowork-vm-service.js` — `writeMessage`, `parseMessage` functions and server connection handler
