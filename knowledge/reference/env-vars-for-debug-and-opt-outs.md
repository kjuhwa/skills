---
version: 0.1.0-draft
name: env-vars-for-debug-and-opt-outs
summary: chrome-devtools-mcp uses a small set of environment variables for debugging and opt-outs — `DEBUG=*` for verbose logs, `CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS=1` to skip npm version checks, `CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS=true` to suppress telemetry — all checked before resource allocation.
category: reference
confidence: medium
tags: [env-vars, debug, opt-out, cli, configuration]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/utils/check-for-updates.ts
imported_at: 2026-04-18T00:00:00Z
---

# Environment Variables

## Context

Many users configure MCP servers inside JSON config files (`.mcp.json`, Claude Desktop's config, etc.) where CLI flag syntax is awkward. Env vars give them a clean knob. Other users run the server inside sandboxed or restricted environments where they must suppress outbound behavior.

## The fact / decision / pitfall

Variables used in chrome-devtools-mcp:

| Env var                                         | Effect                                                               |
|-------------------------------------------------|----------------------------------------------------------------------|
| `DEBUG=*`                                       | Enable verbose logger output (used with `--log-file` for durability) |
| `CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS`          | Skip the npm registry update check entirely                          |
| `CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS=true`  | Suppress telemetry; equivalent to `--no-usage-statistics`            |
| `XDG_RUNTIME_DIR`                               | Used as base for the daemon socket/PID if set                        |
| `XDG_DATA_HOME`                                 | Used for persistent state dir on Linux fallback                      |
| `LOCALAPPDATA`                                  | Used for persistent state dir on Windows                             |
| `DISPLAY`                                       | Detected/inherited for headed Chrome on Linux                        |

Each is checked before the subsystem that uses it allocates resources (e.g. the update-check returns immediately before spawning subprocesses; the telemetry logger is never constructed).

## Evidence

- `src/utils/check-for-updates.ts` — `CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS` early return.
- `src/index.ts` — telemetry gate on `serverArgs.usageStatistics`.
- `scripts/generate-cli.ts` / `scripts/generate-docs.ts` — set `CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS=true` when booting the server for codegen.
- `src/daemon/utils.ts` — `XDG_RUNTIME_DIR` fallback.
- `src/telemetry/persistence.ts` — `LOCALAPPDATA` + `XDG_DATA_HOME`.

## Implications

- Provide both a CLI flag and an env var for major opt-outs. CLI is what scripts use; env var is what config blocks use.
- Document the env vars in the README and in the `--help` output (yargs doesn't do this by default; emit them in your top-level usage text).
- `DEBUG=*` comes from the `debug` npm module convention. If you use it, don't re-invent a new debug env var — inherit the ecosystem.
- Prefix project-specific env vars with the project name (`CHROME_DEVTOOLS_MCP_*`) to avoid collisions. Yes it's ugly; yes it's worth it.
- In Windows config files using `.mcp.json`, env vars go under the top-level `"env"` object — test that path specifically since Node `process.env` is case-insensitive on Windows but case-sensitive in your code.
