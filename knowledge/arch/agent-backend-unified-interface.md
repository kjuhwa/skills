---
version: 0.1.0-draft
name: agent-backend-unified-interface
summary: Unified Go interface for driving multiple coding-agent CLIs (Claude, Codex, OpenCode, OpenClaw, Hermes, Gemini, Pi, Cursor) behind one Execute/Session/Result contract.
category: arch
tags: [agent, interface, go, polymorphism, coding-agents]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: server/pkg/agent/agent.go
imported_at: 2026-04-18T00:00:00Z
---

Shape of the abstraction:

```go
type Backend interface {
    Execute(ctx context.Context, prompt string, opts ExecOptions) (*Session, error)
}

type Session struct {
    Messages <-chan Message  // streams as agent works, closed when finished
    Result   <-chan Result   // exactly one value then closes
}

type Message struct {
    Type MessageType  // text / thinking / tool-use / tool-result / status / error / log
    // ... per-type fields ...
}

type Result struct {
    Status     string  // completed / failed / aborted / timeout
    Output     string
    Error      string
    DurationMs int64
    SessionID  string
    Usage      map[string]TokenUsage  // per-model
}
```

Each backend (`claudeBackend`, `codexBackend`, etc.) implements the interface by spawning the agent CLI, parsing its stream format (JSON-lines in most cases), and translating into the unified message types. A factory (`agent.New(type, cfg)`) dispatches by string.

Shared concerns live in the package-level helpers: `filterCustomArgs` (per-backend blocked-flag list), `mergeEnv`/`isFilteredChildEnvKey` (strip parent agent env vars), `writeMcpConfigToTemp` (--mcp-config via temp file), `resolveSessionID` (distinguish successful resume from fresh-session fallback).

## Why

Without this layer, every feature that needs streaming (UI live preview, cost tracking, persistent task log) would have to implement stream parsing per agent. Centralizing it behind one Go interface means the web app talks to one API and the daemon picks the backend at spawn time based on the agent's `provider` field.

Tradeoff: every new agent needs a backend implementation plus a provider entry in the New() switch plus a launch header string. That's manageable for ~10 agents, getting painful beyond that; at that point move to plugin-style registration.

## Evidence

- `server/pkg/agent/agent.go:15-152` — the contract and factory.
- `server/pkg/agent/claude.go`, `codex.go`, `opencode.go`, etc. — per-backend impls.
