---
version: 0.1.0-draft
name: claudecode-env-var-leakage
summary: When spawning Claude Code from a parent Claude Code session, strip CLAUDECODE*, CLAUDE_CODE_* env vars so the child doesn't inherit the parent's session state.
category: pitfall
tags: [claude-code, environment, subprocess, session, leakage]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: server/pkg/agent/claude.go
imported_at: 2026-04-18T00:00:00Z
---

When Claude Code runs, it exports env vars like `CLAUDECODE`, `CLAUDECODE_*`, and `CLAUDE_CODE_*` so child processes can detect they're running inside a Claude session. If you spawn another Claude Code process from inside one (e.g. a managed-agents daemon that's itself running as a Claude session), those env vars leak to the child and the child behaves as if it's already inside a session.

Fix: filter the parent environment before passing it to the child.

```go
func isFilteredChildEnvKey(key string) bool {
    return key == "CLAUDECODE" ||
           strings.HasPrefix(key, "CLAUDECODE_") ||
           strings.HasPrefix(key, "CLAUDE_CODE_")
}
```

## Why

Symptoms of not doing this: the spawned Claude has strange defaults, auto-reads the parent session's permission grants, or misreports tool-use events. Reproducing is annoying because everything works fine from a plain shell — only breaks from inside a Claude-driven workflow.

## Evidence

- `server/pkg/agent/claude.go:480-486` — `isFilteredChildEnvKey` function.
- `server/pkg/agent/claude.go:463-478` — `mergeEnv` call site.
