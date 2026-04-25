---
version: 0.1.0-draft
name: agent-mcp-config-via-temp-file
summary: Pass MCP server config to a coding-agent CLI via a temp JSON file (--mcp-config <path>), not inline — controls which MCP servers the spawned agent can see, independent of the parent session.
category: arch
tags: [mcp, agents, config, temp-file, claude]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: server/pkg/agent/claude.go
imported_at: 2026-04-18T00:00:00Z
---

When the daemon spawns Claude Code (or another MCP-aware agent) with a specific set of MCP servers, pass the config by file path rather than relying on the parent's MCP config:

```go
path, err := writeMcpConfigToTemp(opts.McpConfig)   // os.CreateTemp + write JSON
args = append(args, "--mcp-config", path)
defer func() { os.Remove(path) }()  // cleanup after goroutine exits
```

Combined with `--strict-mcp-config` the child agent uses only the declared MCP servers, not whatever was in the parent.

## Why

Two reasons:
1. **Explicit control.** The daemon decides which MCP servers the task gets. If Claude inherited the parent session's MCP list, users couldn't lock down agent access.
2. **Isolation.** Passing a file path (not inline args) keeps the config out of process environment and command-line history.

Temp-file ownership handoff pattern: the goroutine that owns the child process also owns the temp file. If the caller returns before the goroutine starts (error path), clean up inline; on successful start, transfer ownership by setting the local cleanup func to nil and let the goroutine `defer os.Remove`.

## Evidence

- `server/pkg/agent/claude.go:44-115` — writeMcpConfigToTemp + ownership handoff.
