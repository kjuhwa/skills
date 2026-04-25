---
version: 0.1.0-draft
name: hermes-prompt-caching-invariants
summary: What must not change mid-conversation to keep Anthropic prompt caching valid.
category: decision
tags: [anthropic, prompt-caching, invariants, llm-agents]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Anthropic Prompt Caching — Mid-Conversation Invariants

From Hermes' policy in `AGENTS.md` under "Prompt Caching Must Not Break".

Prompt caching drops input cost ~75% for multi-turn chats, but only if the **prefix** stays byte-stable across turns. Four things absolutely must not change once a conversation is underway:

## 1. Do not alter past context mid-conversation

No post-hoc rewrites of earlier messages. The moment message N changes, messages N, N+1, N+2, … all have new cache keys. Hermes makes one exception: explicit context compression, which replaces the middle of the transcript with a summary and accepts the one-time cache miss.

## 2. Do not change toolsets mid-conversation

Adding or removing tools regenerates the `tools: [...]` parameter, which is part of the cache key in the tool-using flows. New tools belong to the *next* conversation.

## 3. Do not reload memories mid-conversation

The system prompt assembles SOUL.md + MEMORY.md + AGENTS.md. If you re-read any of these mid-chat, the rendered system prompt changes and the `cache_control` on message 0 is now useless.

Hermes caches system prompt assembly behind `_invalidate_system_prompt()` — called only at legitimate boundaries (session reset, profile switch, MCP tool registration).

## 4. Do not rebuild the system prompt

Even small deterministic changes (timestamp, git commit, terminal size) invalidate the cache. If you need dynamic data, inject it as a **user message** — Hermes does this for skill content via `/skill-name` slash commands.

## When it's OK to invalidate

- **New conversation** (`/new`, `/reset`): fresh cache starts.
- **Compression pass**: deliberate rewrite, accept one miss.
- **MCP tool registration from ACP client**: tools actually changed, rebuild is unavoidable.
- **Model switch (`/model`)**: different model → different cache anyway.

## Why this matters

Breaking cache forces a 3-5x cost multiplier on every subsequent turn. On a typical tool-use session, that's the difference between $0.10 and $0.60 per session. See `agent/prompt_caching.py` for the breakpoint placement (system + last 3 non-system).

## Practical rule

Before any code change that touches system-prompt assembly, toolset resolution, or message history, ask: "does this run mid-conversation?" If yes, gate it behind an explicit invalidate_system_prompt call or defer the change to the next turn.
