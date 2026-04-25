---
version: 0.1.0-draft
name: unix-socket-json-rpc-length-prefixed-framing
summary: Length-prefixed JSON over a Unix domain socket (4-byte big-endian length header + JSON body) provides portable, framing-safe RPC: one-shot connections for synchronous request/response and a persistent connection for server-pushed events.
category: ipc
tags: [unix-socket, json-rpc, ipc, framing, length-prefix, node.js, daemon, protocol]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: low
---

# Unix Socket JSON-RPC with Length-Prefixed Framing

## Context

Unix domain sockets are a fast, portable IPC mechanism for communication
between processes on the same host. When the protocol is JSON, framing is
necessary: TCP (and Unix sockets as streaming transports) does not preserve
message boundaries — a single `send()` on the writer may arrive as multiple
`recv()` calls on the reader, or multiple sends may arrive as one receive
(buffering / Nagle coalescing).

Length-prefixed framing solves this by prepending each message with its byte
count, allowing the reader to know exactly how many bytes to wait for.

## Observation

A simple and portable framing format:
- **4 bytes, big-endian uint32**: length of the JSON payload in bytes.
- **N bytes, UTF-8**: the JSON payload.

The maximum message size is ~4 GB (2^32 bytes), sufficient for any practical
JSON RPC message.

The protocol uses two connection types:
- **One-shot** (request/response): client connects, sends one request,
  receives one response, closes. Used for synchronous method calls.
- **Persistent** (event subscription): client connects, sends
  `{ method: "subscribeEvents" }`, keeps the connection open, receives
  pushed events indefinitely. Used for server-to-client notifications.

Request format:
```json
{ "method": "methodName", "params": { "key": "value" } }
```

Response format (success):
```json
{ "success": true, "result": { "key": "value" } }
```

Response format (error):
```json
{ "success": false, "error": "error message" }
```

Event format (pushed on persistent connection):
```json
{ "type": "stdout", "id": "process-id", "data": "line of output\n" }
{ "type": "exit",   "id": "process-id", "exitCode": 0 }
```

## Why it happens

Unix sockets are stream-oriented (like TCP). Without framing, the reader cannot
tell where one JSON object ends and the next begins. A 4-byte length prefix is
the minimal overhead solution that handles all cases including:
- Messages split across multiple `data` events in Node.js.
- Multiple messages arriving in one `data` event (buffered writes).
- Large messages (locale-sensitive JSON, binary-embedded base64).

Big-endian byte order (network byte order) is used for portability: both the
client and server must agree, and big-endian is the convention for network
protocols.

## Practical implication

**Writer (Node.js):**
```js
function writeMessage(socket, message) {
  const json = JSON.stringify(message);
  const jsonBuf = Buffer.from(json, 'utf8');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(jsonBuf.length, 0);
  socket.write(Buffer.concat([lenBuf, jsonBuf]));
}
```

**Reader (Node.js, accumulating buffer):**
```js
function parseMessage(buffer) {
  if (buffer.length < 4) return null;
  const len = buffer.readUInt32BE(0);
  if (buffer.length < 4 + len) return null;
  const json = buffer.subarray(4, 4 + len).toString('utf8');
  const remaining = Buffer.from(buffer.subarray(4 + len));
  return { message: JSON.parse(json), remaining };
}

let buf = Buffer.alloc(0);
socket.on('data', (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  let parsed;
  while ((parsed = parseMessage(buf)) !== null) {
    handleMessage(parsed.message);
    buf = parsed.remaining;
  }
});
```

**Socket path convention**: use `$XDG_RUNTIME_DIR/service-name.sock` on Linux
for per-user sockets. Fall back to `/tmp` if `XDG_RUNTIME_DIR` is unset.

**Retry logic**: callers should retry connecting with exponential backoff
(e.g., 5 attempts × 1s delay) because the server daemon may still be starting
when the first connection attempt arrives.

**Stale socket cleanup**: synchronously `unlink()` any existing socket file
before calling `server.listen()`. This handles the case where the daemon
crashed without cleaning up, and ensures the next `listen()` succeeds rather
than failing with `EADDRINUSE`.

## Source reference

- `scripts/cowork-vm-service.js`: `writeMessage()`, `parseMessage()` — exact
  implementations with comments explaining the framing format.
- `scripts/cowork-vm-service.js`: `SOCKET_PATH` — `XDG_RUNTIME_DIR` with
  `/tmp` fallback.
- `docs/cowork-linux-handover.md`: "Service Daemon" section — protocol
  description and connection type distinction.
