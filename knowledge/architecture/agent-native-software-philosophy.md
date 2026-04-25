---
version: 0.1.0-draft
name: agent-native-software-philosophy
summary: Craft Agents' "Agent Native" premise — describe what you want, let the agent figure out how, and treat customization itself as a prompt rather than a code change.
category: architecture
tags: [product, philosophy, agent-native]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: README.md
imported_at: 2026-04-18T00:00:00Z
---

# Agent Native Software Philosophy

Craft Agents (the app the repo powers) is built on a stated "Agent Native" premise: a user describes what they want, the agent figures out how. The repo's README puts it as "that's a good use of tokens" — meaning the product doesn't try to hide its LLM usage behind polished wizards; instead, it leans into open-ended prompt routing as the primary UX.

Concrete consequences visible in the codebase:

- **Source onboarding is a prompt.** Instead of OAuth config wizards for each integration, the agent is told "add Linear as a source", then reads the public docs, locates an MCP server, walks the user through credentials. See `apps/electron/resources/docs/` and source-type plumbing under `packages/shared/src/sources/`.
- **Skills are folders, not plugins.** `packages/shared/src/skills/storage.ts` loads any `SKILL.md` dropped into `~/.craft-agent/workspaces/{id}/skills/<slug>/`. Add behavior by writing Markdown; no rebuild.
- **Customization is prompt-driven.** The README claims the team itself builds the app using only Craft Agents — "any customisation is just a prompt away". This is reflected in the very wide public surface of the `server-core` RPC layer: every user-visible action is RPC-addressable, so an agent has levers for everything.
- **Heavy reliance on @mentions for composition.** Skills, sources, and labels are all `@`-mentionable in session prompts, and `packages/shared/src/mentions/` is a first-class module. Composition happens at the prompt level, not via a visual editor.
- **Permission modes are a UX-first concept, not a security primitive.** Explore / Ask / Execute map to an internal `safe`/`ask`/`allow-all` (see `packages/shared/src/agent/mode-types.ts`) and are cycleable with one keybinding — friction is intentionally low so users stay in flow.

Trade-off: because the app leans on prompts, its behavior is less predictable than a traditional GUI app. That's why automations (see `packages/shared/src/automations/`) exist as a deterministic sidecar, and why the `--validate-server` 21-step integration test matters — both constrain the non-determinism.
