---
name: stale-persistent-context-detection
description: Detect and remove stale error snapshots that LLM tools inject via persistent-context files (CLAUDE.md, AGENTS.md, system prompts, memory) before chasing a fix. If the current source already compiles, the injected error is a ghost from a previous session, not a real bug.
category: workflow
tags: [llm, context, claude-code, cursor, agents-md, memory, stale, debugging, hygiene]
triggers: [CLAUDE.md, AGENTS.md, persistent context, stale error, system-reminder, injected error, claudeMd context, system prompt, agent instructions, injected context]
source_project: skills-hub-setup-session
version: 1.0.0
---

# Stale Persistent-Context Detection

See content.md for the detection protocol, false-positive guards, and cleanup steps.
