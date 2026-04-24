---
name: claude-session-resume-semantics
summary: If claude --resume <id> doesn't find the session, Claude silently generates a fresh session and exits. Treat emitted_id != requested_id AND failed status as "resume didn't land".
category: api
tags: [claude-code, session, resume, pitfall, llm]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: server/pkg/agent/claude.go
imported_at: 2026-04-18T00:00:00Z
---

When you invoke `claude --resume <session_id>`:
- If the session exists on disk → resumed normally, emitted `session_id` matches requested.
- If the session does not exist → Claude prints `No conversation found with session ID: ...` to stderr, generates a fresh session ID, emits events with that new ID, and exits non-zero.

If your orchestrator persists the emitted session ID blindly, it will record a brand-new unrelated session as though resume had succeeded. Future "resume this task" calls then keep forking fresh sessions and the task state is effectively lost.

Correct handling:

```go
func resolveSessionID(requestedResume, emitted string, failed bool) string {
    if failed && requestedResume != "" && emitted != "" && emitted != requestedResume {
        return ""  // signal caller to retry with a fresh session
    }
    return emitted
}
```

Report `""` so the daemon's retry path runs, rather than silently persisting a brand-new ID as if resume had succeeded.

## Why

Claude doesn't expose "did resume land?" as a first-class signal — you have to infer from the session-id-mismatch + exit-status combo. Without this inference the system drifts over time; after enough "resume missed" events the task log in your DB has no useful session continuity.

## Evidence

- `server/pkg/agent/claude.go:448-461` — `resolveSessionID` and its comment block.
- `server/pkg/agent/claude.go:185-198` — call site where the result is logged.
