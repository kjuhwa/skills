---
version: 0.1.0-draft
name: rpc-channel-namespaces
summary: The RPC channel namespace convention (system:*, workspaces:*, sessions:*, sources:*, skills:*, credentials:*, LLM_Connection:*, transfer:*) defined in @craft-agent/shared/protocol and used by every client (Electron renderer, CLI, web UI).
category: reference
tags: [rpc, protocol, channels]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/protocol/channels.ts
imported_at: 2026-04-18T00:00:00Z
---

# RPC channel namespaces

All client-server RPC in Craft Agents goes through named channels defined in `packages/shared/src/protocol/channels.ts` as `RPC_CHANNELS`. Convention: `namespace:verb` with colon separator.

### Namespaces

| Namespace | Purpose | Sample channels |
|---|---|---|
| `system:*` | Runtime info | `system:versions`, `system:homeDir` |
| `credentials:*` | Credential lifecycle | `credentials:healthCheck` |
| `workspaces:*` | Workspace CRUD | `workspaces:get`, `workspaces:create`, `workspaces:delete` |
| `sessions:*` | Session ops | `sessions:get`, `sessions:create`, `sessions:getMessages`, `sessions:send`, `sessions:delete`, `sessions:import` |
| `sources:*` | Source ops | `sources:get`, `sources:create`, `sources:update`, `sources:delete`, `sources:CHANGED` (push) |
| `skills:*` | Skill ops | `skills:get`, `skills:create`, `skills:delete` |
| `statuses:*` | Custom status workflow | `statuses:get`, `statuses:update` |
| `LLM_Connection:*` | LLM connection management | `LLM_Connection:list`, `LLM_Connection:create`, `LLM_Connection:validate` |
| `transfer:*` | Chunked RPC for big payloads | `transfer:start`, `transfer:chunk`, `transfer:commit`, `transfer:abort` |
| `session:event` | Push channel for streamed session events | (push-only) |
| `oauth:*` | OAuth flow coordination | `oauth:start`, `oauth:callback` |

### Push events
Channels ending in `CHANGED` or matching `session:event` are server-push (no response expected). Clients subscribe via `listen(channel)`; server publishes via `pushTyped(wsServer, channel, target, workspaceId, payload)`. Targeting lets you push to a single client, a workspace, or broadcast.

### Why uppercase `LLM_Connection`
Inconsistent casing is intentional historical — that namespace predated the convention. Changing it is a breaking change for any external scripts; maintained for stability. Newer namespaces are lowercase.

### Pattern for adding a new namespace
1. Add to `packages/shared/src/protocol/channels.ts#RPC_CHANNELS` (const-object style so TypeScript literal types flow through).
2. Declare typed handler signatures in `protocol/dto.ts`.
3. Implement in `packages/server-core/src/handlers/rpc/<namespace>.ts`.
4. Register in `registerCoreRpcHandlers`.
5. CLI can use `invoke <channel> [json-args]` to call raw; for fluent use, add a typed wrapper in `apps/cli/src/client.ts`.

### Reference
- `packages/shared/src/protocol/channels.ts`
- `packages/server-core/src/handlers/rpc/*`
- `apps/electron/src/transport/channel-map.ts` — client-side type map.
