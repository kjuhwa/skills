---
version: 0.1.0-draft
name: config-dir-layout
summary: Full layout of ~/.craft-agent/ including app-level config/credentials/preferences/themes and per-workspace subdirs for sessions, sources, skills, statuses, automations.
category: reference
tags: [filesystem, config, workspaces, layout]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: README.md
imported_at: 2026-04-18T00:00:00Z
---

# `~/.craft-agent/` directory layout

The entire user state for Craft Agents lives under one directory tree. Layout:

```
~/.craft-agent/
├── config.json              # Main config: workspace list, LLM connection registry
├── credentials.enc          # AES-256-GCM encrypted credentials (all workspaces)
├── preferences.json         # User prefs (theme mode, default model, etc.)
├── theme.json               # App-level theme
└── workspaces/
    └── {workspace-id}/
        ├── config.json        # Workspace settings
        ├── theme.json         # Workspace theme (overrides app)
        ├── automations.json   # Event-driven automation rules (version 2 schema)
        ├── automations-history.jsonl  # Append-only audit trail
        ├── sessions/
        │   └── {session-id}/
        │       ├── session.jsonl     # Header + messages (JSONL)
        │       ├── long_responses/   # Saved large tool results
        │       └── plans/            # SubmitPlan artifacts
        ├── sources/
        │   └── {slug}/
        │       ├── config.json
        │       └── .credential-cache.json  # Decrypted per-session, user-scoped (0600)
        ├── skills/
        │   └── {slug}/
        │       └── SKILL.md    # gray-matter frontmatter + markdown body
        └── statuses/
            └── config.json     # Custom status workflow (Todo/In Progress/...)
```

### Alternate locations
- **Multi-instance dev**: `~/.craft-agent-1`, `~/.craft-agent-2`, ... via `CRAFT_CONFIG_DIR` env.
- **Packaged app logs**: macOS `~/Library/Logs/@craft-agent/electron/main.log`, Windows `%APPDATA%\@craft-agent\electron\logs\main.log`, Linux `~/.config/@craft-agent/electron/logs/main.log`.
- **uv cache**: `~/.cache/uv/` (Python tools — pinned 3.12 auto-installed on first use, ~20MB).

### Portability properties
- Deleting a workspace = `rm -rf workspaces/{id}/`. No cross-cutting state elsewhere to clean up.
- Moving a workspace folder to another machine works IF you also copy the workspace-level config.json into the new `workspaces/` and regenerate session-path tokens. Session JSONL files use `{{SESSION_PATH}}` tokens so they don't carry the old absolute path (see `packages/shared/src/sessions/jsonl.ts`).
- Credentials stay at the app level — not per-workspace — because users don't want to re-auth Gmail 3 times for 3 workspaces.

### .credential-cache.json
Transient file written by the Electron main process so stdio MCP subprocesses can read secrets without having them in env. Scoped per source slug, not per session. Chmod 0600. Never commit / share / sync.

### Automations file
`automations.json` is a Version 2 schema; keyed by event name (`LabelAdd`, `SchedulerTick`, ...) to arrays of matcher+actions. Validated on load; errors dropped with warnings rather than crashing.
