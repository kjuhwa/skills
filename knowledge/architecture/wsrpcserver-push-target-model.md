---
version: 0.1.0-draft
name: wsrpcserver-push-target-model
summary: pushTyped(wsServer, channel, target, workspaceId, payload) uses a PushTarget union ({ to: 'workspace' } | { to: 'client'; clientId } | { to: 'broadcast' }) so the server can efficiently unicast, workspace-broadcast, or global-broadcast a single serialized envelope.
category: architecture
tags: [websocket, push, broadcast, targeting]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/server-core/src/transport/push.ts
imported_at: 2026-04-18T00:00:00Z
---

# WsRpcServer push targeting model

### The abstraction
Server-side push is typed via `PushTarget`:
```ts
type PushTarget =
  | { to: 'workspace'; workspaceId: string }   // all clients subscribed to this workspace
  | { to: 'client';    clientId: string }       // one specific client connection
  | { to: 'broadcast' }                          // every connected client (rare)
```

And the helper:
```ts
pushTyped(wsServer, channel, target, workspaceId, payload)
```

### Why per-workspace routing
An Electron app may have multiple windows open on the same server, each potentially on a different workspace. Push events like `sources:CHANGED` should only fan out to clients watching THAT workspace — a Linear source update shouldn't notify someone on a different workspace.

### One serialization, many writes
The server serializes the envelope ONCE (to a UTF-8 string), then writes the same bytes to each target client's socket. Avoids repeated JSON.stringify on broadcasts. Each client also gets a per-client sequence number for replay-on-reconnect, so the outer envelope has a client-local header prepended.

### Lifecycle of a push
1. Handler triggers push (e.g. `sources.create` calls `pushSourcesChanged(workspaceId)`).
2. `pushTyped` resolves target → set of clients.
3. For each client, assign next `seq`, format final envelope, append to ring buffer, send.
4. On disconnect, envelope stays in ring; on reconnect with `lastSeenSeq`, server replays missed (see `ws-rpc-heartbeat-event-buffer` skill).

### Integration with handler system
Handlers have access to `wsServer` via `HandlerDeps`. Idiomatic:
```ts
// In a handler
await doWork();
pushTyped(deps.wsServer, RPC_CHANNELS.sources.CHANGED, { to: 'workspace', workspaceId }, workspaceId, sources);
return { ok: true };
```

### Why `workspaceId` appears twice
The `PushTarget` includes `workspaceId` for routing; the outer arg also takes a `workspaceId` to tag the envelope for filtering on the client side. Redundant-looking but practical — client libraries can dispatch by `envelope.workspaceId` without decoding the target.

### Reference
- `packages/server-core/src/transport/push.ts`
- `packages/shared/src/protocol/channels.ts` — naming convention `namespace:CHANGED`.
- Consumer example: `packages/server/src/index.ts`'s `pushSourcesChanged` closure.
