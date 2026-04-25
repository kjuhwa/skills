---
version: 0.1.0-draft
name: codex-seatbelt-ignores-network-access
summary: On macOS, Codex CLI's Seatbelt sandbox in workspace-write mode silently ignores network_access=true, causing "no such host" errors inside agent sessions.
category: pitfall
tags: [codex, macos, sandbox, seatbelt, dns, network]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: docs/codex-sandbox-troubleshooting.md
imported_at: 2026-04-18T00:00:00Z
---

On macOS, when Codex is configured with `sandbox_mode = "workspace-write"`, the Seatbelt profile hard-codes `CODEX_SANDBOX_NETWORK_DISABLED=1` and blocks DNS/UDP syscalls even if `[sandbox_workspace_write] network_access = true` is set. Code inside the sandbox sees `dial tcp: lookup HOST: no such host` while a plain shell on the same host resolves the same domain fine. Linux (Landlock) is not affected.

## Why

Upstream bug: `openai/codex#10390`. Until a fixed Codex release ships, the only reliable workaround on macOS is to write `sandbox_mode = "danger-full-access"` for that session, which drops the Seatbelt filesystem sandbox entirely. When emitting TOML into a user-owned `config.toml`, use top-level dotted-key assignments (`sandbox_workspace_write.network_access = true`) instead of a `[sandbox_workspace_write]` section header — otherwise a bare `sandbox_mode = ...` sitting below a preceding user table like `[permissions.multica]` is parsed as `permissions.multica.sandbox_mode` and silently ignored.

Distinguishing fingerprint:
- `no such host` inside Codex session, but host shell `curl` works → Seatbelt bug.
- `connection refused` → server not running on that port.
- `i/o timeout` → container-level network policy / firewall.
- `x509: certificate signed by unknown authority` → TLS/CA issue, unrelated.

## Evidence

- `docs/codex-sandbox-troubleshooting.md` — full fingerprint table and mitigation.
- `server/internal/daemon/execenv/codex_sandbox.go:13-100` — policy decision code and rationale.
