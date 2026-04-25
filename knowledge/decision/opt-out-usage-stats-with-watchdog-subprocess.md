---
version: 0.1.0-draft
name: opt-out-usage-stats-with-watchdog-subprocess
summary: Chrome DevTools MCP implements opt-out telemetry by spawning a detached watchdog child, shipping events to Clearcut via a batched buffer, and gating the whole subsystem on `--no-usage-statistics` (or env var) checked before the telemetry logger is even constructed.
category: decision
confidence: high
tags: [telemetry, opt-out, privacy, watchdog, clearcut]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/index.ts
imported_at: 2026-04-18T00:00:00Z
---

# Opt-Out Usage Statistics with Watchdog

## Context

You want product telemetry for a CLI/MCP server but must balance: (1) privacy (no URLs, no queries, no selectors), (2) reliability (zero chance of blocking tool calls), (3) respectful defaults (opt-out with a one-line disclaimer, one flag to disable).

## The fact / decision / pitfall

The design, in layers:

- **Opt-out semantics.** Telemetry is on by default with a printed disclaimer at startup: `"Google collects usage statistics to improve Chrome DevTools MCP. To opt-out, run with --no-usage-statistics."` This is the baseline for respectful opt-out.
- **Kill switch before allocation.** The `ClearcutLogger` is only constructed if `serverArgs.usageStatistics`; setting `CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS=true` (used in codegen scripts) also suppresses construction. Disabled telemetry allocates *nothing*.
- **Detached watchdog subprocess.** The logger spawns a `watchdog/main.js` child over stdin (`stdio: ['pipe', 'ignore', 'ignore']`, `detached: true`, `child.unref()`). All actual event shipping happens there.
- **Sanitized params.** Tool parameters are reduced to type-appropriate derivatives before logging (strings → length, arrays → count, enums → value, primitives → as-is). See the `sanitize-tool-params-for-metrics` pattern.
- **Shutdown-safe flush.** The watchdog detects parent death via `stdin end`/`close`/`disconnect`, emits a `server_shutdown` event, and races a final flush against a 5s timeout.
- **Session rotation.** A 24h session-id rotation prevents long-lived daemons from correlating across days.
- **Server-hint-respecting rate limit.** Each flush response's `next_request_wait_millis` is honored, clamped above `MIN_RATE_LIMIT_WAIT_MS` (30s).

## Evidence

- `src/index.ts::createMcpServer` — constructs `ClearcutLogger` only if `serverArgs.usageStatistics`.
- `src/telemetry/WatchdogClient.ts` — detached child spawning pattern.
- `src/telemetry/watchdog/ClearcutSender.ts` — buffered send with transient/permanent error split, session rotation.
- `src/telemetry/flagUtils.ts::sanitizeParams` — parameter transformation to privacy-safe shapes.
- `logDisclaimers` in `src/index.ts` — the printed opt-out notice.

## Implications

- If you adopt this pattern, the telemetry disclaimer is the *only* user-visible effect of telemetry existing. Any other noise (extra startup logs, extra config files) is friction that costs goodwill.
- Do *not* make opt-out painful — one flag, one env var, documented at startup. Anything else erodes trust.
- Treat the watchdog as an external dependency for architectural purposes: it has its own argv protocol, its own lifecycle, and can be tested separately.
- Never `await` telemetry inside the tool hot path. Fire and forget via `void logger?.logToolInvocation(...)` in `finally`.
- Audit regularly: walk the logged fields and confirm none are user data. New tools adding new params need an audit gate.
