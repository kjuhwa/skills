---
version: 0.1.0-draft
name: session-as-jsonl-append-only
summary: Rationale for storing agent sessions as append-only JSONL (header line + one message per line) rather than a single JSON blob — fast append writes, cheap header-only scans, atomic message semantics.
category: architecture
tags: [jsonl, append-only, session-storage, performance]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/sessions/jsonl.ts
imported_at: 2026-04-18T00:00:00Z
---

# Sessions as append-only JSONL

### Layout
`<workspace>/sessions/<session-id>/session.jsonl`:
- Line 1 = `SessionHeader` (mutable metadata: name, labels, permissionMode, flags, last-read-id, status).
- Lines 2+ = `StoredMessage`, one JSON object per line, never modified once written.

### Why JSONL, not JSON
- **Append is O(1)**. Adding a message opens the file, seeks end, writes one line. A single-JSON layout would require rewriting the full file on every message — prohibitive for long sessions (100k+ messages happen).
- **Header-only reads are cheap**. The session list UI reads just the first ~8KB of each file (`readSessionHeader` uses low-level `fs.openSync`+`readSync` until first `\n`) — you don't parse hundreds of messages just to render the inbox.
- **Message immutability as a property**. Once a line is written, its JSON never changes; any mutation IS a new line. That sidesteps all concurrent-write races for the message body (the header is the only mutable part and it's written via atomic rename).

### Header update atomicity
Header updates (rename, label, status change) use a `.tmp` + `rename()` pattern:
1. Read current file.
2. Replace the first line with the new header.
3. Write to `session.jsonl.tmp`.
4. `rename('.tmp', 'session.jsonl')` — atomic on POSIX.

### Portable paths
Agent messages reference session-local files (`datatable src`, `planPath`, attachment `storedPath`). These paths are absolute when written to memory; before serialization they're replaced with the `{{SESSION_PATH}}` token. On read, the token is expanded to the CURRENT session dir. Result: a session folder can be moved between machines / users / paths without breaking in-message references.

Special handling for Windows: JSON escapes `\` to `\\`, so the JSON-escaped path variant also needs replacement.

### Debounce + serialize
Rapid in-memory updates to the header (flag flips, token-usage updates) are coalesced with a 500ms debounce (`SessionPersistenceQueue`). Serialized per-session to avoid concurrent `.tmp` rename races.

### Scaling limits
- Open file handle briefly per append; at thousands of sessions with frequent writes, consider batching.
- Header line grows with labels; keep labels array short.
- `long_responses/` files (saved large tool outputs) live OUTSIDE the jsonl but inside the session dir — the JSONL stores only a relative reference.

### Reference
- `packages/shared/src/sessions/jsonl.ts`
- `packages/shared/src/sessions/persistence-queue.ts`
- `packages/shared/src/sessions/types.ts`
