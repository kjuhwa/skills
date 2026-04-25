---
version: 0.1.0-draft
name: permission-modes-as-product-primitive
summary: Craft Agents treats three permission modes (explore/ask/execute, internal safe/ask/allow-all) as a first-class product primitive — cycled by SHIFT+TAB, fired as bus events, stored per-session, with a CompiledBashPattern allowlist driving Explore.
category: architecture
tags: [permissions, product, safety, bash-validator]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/agent/mode-types.ts
imported_at: 2026-04-18T00:00:00Z
---

# Permission modes as a product primitive

Rather than burying "can the agent write files" inside a hundred config flags, Craft Agents elevates it to a single three-mode state per session:

| Internal key | Canonical UI | Behavior |
|---|---|---|
| `safe` | Explore | Read-only; blocks all writes via bash-ast validator + tool allowlist. |
| `ask` | Ask | Prompts for approval per tool call (default). |
| `allow-all` | Execute | Auto-approves everything (Claude Code default, gated behind explicit opt-in here). |

### Mechanics
- Cycle with SHIFT+TAB (`packages/shared/src/agent/mode-manager.ts#cyclePermissionMode`).
- Stored in the session header (one of the few mutable fields). Diffed via signature to avoid unnecessary writes.
- Emits `PermissionModeChange` event on the automation bus → users can wire webhooks or logging.
- Previous mode is preserved (`previousPermissionMode` in header) for instant undo.

### Explore-mode bash validation
The `bash-validator.ts` parses commands with `bash-parser` into an AST and evaluates each subcommand of a `&&`/`||`/pipeline against a `CompiledBashPattern` allowlist. Subcommand-level feedback so a blocked compound command shows which part was unsafe.

Blocked in Explore regardless of allowlist:
- Pipelines (`|`)
- Output redirection (`>`, `>>`)
- Command substitution (`$(…)`, backticks)
- Process substitution (`<(…)`)
- Env assignment (`FOO=1 cmd`)
- Background execution (`&`)

### Why this matters for UX
The "Execute / Auto" mode that other agent tools default to makes users nervous. The cycling keybinding lets users dip into higher trust for one turn, then fall back — matching how humans mentally gate trust. PermissionMode events being observable lets automations enforce org policy: "if mode is `allow-all` in a non-approved workspace, post a Slack webhook and force back to `ask`".

### Pointer
`packages/shared/src/agent/mode-types.ts` (types + cycle + parse), `mode-manager.ts` (runtime state + diagnostics), `bash-validator.ts` (AST enforcement).
