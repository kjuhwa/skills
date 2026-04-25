---
version: 0.1.0-draft
name: protocol-version-backward-compat
summary: Client/server handshake exchanges PROTOCOL_VERSION from shared/protocol; version mismatches produce a dedicated PROTOCOL_VERSION_UNSUPPORTED error rather than generic connection failure.
category: architecture
tags: [protocol, versioning, handshake, compatibility]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/protocol
imported_at: 2026-04-18T00:00:00Z
---

# Protocol version + backward compat

### Shared version constant
`packages/shared/src/protocol/index.ts` exports `PROTOCOL_VERSION` (an integer). Both the standalone CLI and the Electron renderer connect to a server; both must agree on the version.

### Handshake flow
1. Client sends a `hello` message with `{ clientId, protocolVersion, capabilities }`.
2. Server checks `client.protocolVersion` against `SERVER_PROTOCOL_VERSION`.
3. Match → send handshake response with the server's version and go live.
4. Mismatch → close with code `PROTOCOL_VERSION_UNSUPPORTED`. Client surfaces a clear "Update CLI and server to matching versions" error.

### Why an int, not semver
Deliberate simplicity. Major version bumps are rare; every incompatible change increments by 1, compatible-additive changes don't touch it. Clients + servers in the field just compare `>= min` or `=== current`.

### Capabilities as the alternative to breaking changes
New features are advertised as capabilities (`Set<string>` on each client). Handler code checks `if (client.capabilities.has('large-tool-results'))` before using the new shape, falls back to old shape otherwise. Keeps protocol version stable even while features add up.

### What breaks the version
- Changing `MessageEnvelope` structure.
- Renaming core channel namespaces.
- Changing auth token validation.

### What doesn't
- Adding a new RPC channel.
- Adding optional fields to existing channel payloads.
- Adding a new push event.

### Heartbeat, event buffer, chunked RPC
All driven by constants in `packages/shared/src/protocol/index.ts` (`HEARTBEAT_INTERVAL_MS`, `HEARTBEAT_MAX_MISSED`, `EVENT_BUFFER_MAX_SIZE`, `EVENT_BUFFER_TTL_MS`, `DISCONNECTED_CLIENT_TTL_MS`). Changing any of these quietly alters protocol semantics — treat them as versioned.

### Reference
- `packages/shared/src/protocol/index.ts`, `channels.ts`, `types.ts`
- `packages/server-core/src/transport/server.ts` — version check on upgrade.
- CLI troubleshooting table in `docs/cli.md` mentions the error code.
