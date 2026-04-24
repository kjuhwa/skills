---
name: typed-websocket-rpc-boundary-validation
description: Enforce strict schema validation at the WebSocket transport layer to catch contract breakages early
category: websocket
version: 1.0.0
version_origin: extracted
confidence: high
tags: [websocket, rpc, validation, types]
source_type: extracted-from-git
source_url: https://github.com/pingdotgg/t3code.git
source_ref: main
source_commit: 9df3c640210fecccb58f7fbc735f81ca0ee011bd
source_project: t3code
imported_at: 2026-04-18
evidence:
  - apps/server/src/wsServer.ts
  - packages/contracts/src/rpc.ts
  - .docs/provider-architecture.md
---

## When to Apply
- You serve WebSocket RPC with multiple method handlers (requests + typed pushes)
- You want decode failures to produce structured diagnostics with path/reason
- You need to prevent invalid payloads from reaching business logic
- Client/server contracts can drift; early validation catches breakages

## Steps
1. Define contracts as schema unions in a shared package (e.g., `@t3tools/contracts/src/rpc.ts`)
2. Define RPC method shapes, request/response schemas, and push channel schemas
3. At server startup, create RPC server with schema-based encoding/decoding
4. On client, create transport that wraps outbound requests and inbound pushes with schema parsing
5. Decode failures at transport boundary immediately return `WsDecodeDiagnostic` with `code`, `reason`, and path
6. Never cast payloads; always parse through schema
7. For pushes, validate and cache per channel; allow clients to opt into `replayLatest`

## Example
```typescript
// Server: define schemas
const ServerWelcomeSchema = Schema.Struct({ type: Schema.Literal('server.welcome'), state: ThreadStateSchema })
const RpcGroup = Schema.Union([ MethodASchema, MethodBSchema ])

// Server: validate inbound
const request = yield* Schema.decode(RpcGroup)(payload)  // throws or returns typed request

// Client: encode/decode via transport
const wsTransport = new WsTransport({
  url: 'ws://server',
  schemas: { 'server.welcome': ServerWelcomeSchema, ... }
})
wsTransport.on('server.welcome', (data) => { /* data is typed */ })
```

## Counter / Caveats
- Schema validation adds latency; use for contract boundaries, not hot loops
- Caching latest push per channel can grow memory; cap channel subscriptions
- If schema is too strict, valid legacy clients may disconnect; plan versioning strategy
- Decode path info helps debugging but reveals schema structure to clients
