---
version: 0.1.0-draft
name: agent-custom-args-blocked-flags
summary: User-configured custom_args get a deny-list filter for protocol-critical flags only, not every dangerous flag — workspace members are trusted but not trusted to break the wire protocol.
category: decision
tags: [agent, cli, security, custom-args, filtering]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: server/pkg/agent/claude.go
imported_at: 2026-04-18T00:00:00Z
---

When users can provide `custom_args` that are appended to an agent CLI invocation, a narrow deny-list is the right tool: block only the flags you hardcode for protocol reasons (e.g. `--output-format`, `--input-format`, `--permission-mode`, `--mcp-config`). Everything else passes through.

```go
var claudeBlockedArgs = map[string]blockedArgMode{
    "-p":                blockedStandalone,
    "--output-format":   blockedWithValue,
    "--input-format":    blockedWithValue,
    "--permission-mode": blockedWithValue,
    "--mcp-config":      blockedWithValue,
}
```

## Why

A broader deny-list (e.g. "block anything that writes files") is the wrong model — workspace members are trusted to run agents in their own workspace the way they want. The narrow list is purely about not letting users accidentally break the daemon↔agent communication protocol. Log at WARN when a blocked flag is dropped so users see why their option didn't take effect.

Each backend defines its own blocked set. Same mental model as `custom_env` — trusted, not sandboxed.

## Evidence

- `server/pkg/agent/claude.go:383-416` — `claudeBlockedArgs` and `filterCustomArgs`.
- `server/pkg/agent/claude.go:495-532` — full filter impl with rationale comment.
