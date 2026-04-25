---
version: 0.1.0-draft
name: provider-session-loss-on-client-reconnect
summary: If client disconnects and reconnects, server may kill provider session if not re-claimed; requires session binding and recovery logic
type: knowledge
category: pitfall
confidence: medium
tags: [pitfall, provider, session, resilience]
source_type: extracted-from-git
source_url: https://github.com/pingdotgg/t3code.git
source_ref: main
source_commit: 9df3c640210fecccb58f7fbc735f81ca0ee011bd
source_project: t3code
imported_at: 2026-04-18
evidence:
  - apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.ts
---

## Fact
When a WebSocket client disconnects, the server doesn't immediately know if the client is coming back. Provider sessions are tied to client connections for safety. If reconnect is too slow, or if session state is not cached, the session is terminated. Recent git commits ("Preserve provider bindings when stopping sessions") address this with session binding and recovery logic.

## Why it matters
1. **Network hiccups are normal** — WiFi drop, browser tab dormancy, SSH timeout; client may reconnect after seconds/minutes
2. **Agent work in progress** — if session dies, in-flight turns are lost, and user must start over
3. **Long-running turns vulnerable** — if a turn takes 5+ minutes and network flickers, session is lost mid-turn
4. **Recovery must be fast** — if client caches session binding, reconnect can resume within seconds

## Evidence
- Commit "Preserve provider bindings when stopping sessions (#2125)" shows session caching and recovery path
- ProviderRuntimeIngestion tracks session lifecycle
- Session state is now persisted; on reconnect, old session is re-bound if client ID matches

## How to apply
- On client, cache session ID and binding token; on reconnect, pass them in resume request
- On server, check if session is already active for that binding; if yes, re-attach instead of creating new
- Implement timeout: if client doesn't reconnect within N seconds, clean up session
- Test reconnect: start a turn, disconnect mid-way, reconnect, verify turn resumes (not restarted or lost)
- Document the session recovery window and what happens if reconnect takes too long
