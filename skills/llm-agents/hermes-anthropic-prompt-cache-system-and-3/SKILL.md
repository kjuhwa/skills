---
name: hermes-anthropic-prompt-cache-system-and-3
description: Place Anthropic 4 cache_control breakpoints as system + last 3 messages so multi-turn chats keep a hot cache.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [llm-agents, anthropic, prompt-caching, cost-optimization]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Anthropic Prompt Cache — `system_and_3` Strategy

## Context

Anthropic's prompt cache allows up to 4 `cache_control` breakpoints per request. Used well, they reduce multi-turn input cost by ~75%. Used badly (e.g. re-rendering the system prompt each turn), they save nothing.

Hermes uses the "system_and_3" scheme: pin the system prompt + the last 3 non-system messages on a rolling window. Because Anthropic's cache keys on prefix equality, anything stable earlier in the conversation is automatically covered by the system-prompt breakpoint.

## When to use

- You are building a tool-calling loop against Claude 3/4 through the Anthropic SDK or a proxy that forwards `cache_control`.
- Your conversations are long (10+ turns) and the system prompt is large (tool schemas, policy, skills).
- You want caching to survive across tool-result turns without a stale TTL.

## Procedure

### 1. Do not mutate earlier context mid-conversation

From `AGENTS.md` policy: never alter past messages, change toolsets, or rebuild the system prompt mid-conversation. Those rewrites invalidate the cache key and force full reprocessing. The only legitimate mid-conversation rewrite is an explicit context compression pass.

### 2. Apply 4 breakpoints: system + last 3 non-system

```python
# agent/prompt_caching.py
def apply_anthropic_cache_control(
    api_messages: List[Dict[str, Any]],
    cache_ttl: str = "5m",
    native_anthropic: bool = False,
) -> List[Dict[str, Any]]:
    messages = copy.deepcopy(api_messages)
    if not messages:
        return messages

    marker = {"type": "ephemeral"}
    if cache_ttl == "1h":
        marker["ttl"] = "1h"

    breakpoints_used = 0
    if messages[0].get("role") == "system":
        _apply_cache_marker(messages[0], marker, native_anthropic=native_anthropic)
        breakpoints_used += 1

    remaining = 4 - breakpoints_used
    non_sys = [i for i in range(len(messages)) if messages[i].get("role") != "system"]
    for idx in non_sys[-remaining:]:
        _apply_cache_marker(messages[idx], marker, native_anthropic=native_anthropic)
    return messages
```

See `agent/prompt_caching.py:41-72`.

### 3. Handle all message content shapes

The same helper must deal with `content: str`, `content: [{type:"text", ...}]`, tool messages, and empty content:

```python
def _apply_cache_marker(msg, cache_marker, native_anthropic=False):
    role = msg.get("role", "")
    content = msg.get("content")

    if role == "tool":
        if native_anthropic:
            msg["cache_control"] = cache_marker
        return  # OpenAI-format proxies don't let us mark tool blocks directly

    if content is None or content == "":
        msg["cache_control"] = cache_marker
        return
    if isinstance(content, str):
        msg["content"] = [{"type": "text", "text": content, "cache_control": cache_marker}]
        return
    if isinstance(content, list) and content:
        last = content[-1]
        if isinstance(last, dict):
            last["cache_control"] = cache_marker
```

See `agent/prompt_caching.py:15-39`.

### 4. Only break the cache for compression

When the agent must compress (context near limit), rewrite the middle turns into a summary and resume. The system prompt and the new tail still get cached on the next turn. See `agent/context_compressor.py` for the full compaction flow.

### 5. Inject skill content as `user` message, never as system prompt append

Loading a skill via `/skill-name` appends its content as a new **user** message rather than re-rendering the system prompt. This keeps the system-prompt cache breakpoint valid for the rest of the session. See `AGENTS.md`: "Skill slash commands ... inject as user message (not system prompt) to preserve prompt caching."

## Pitfalls

- **Do not regenerate the system prompt each turn.** Even small timestamp drift breaks the cache. Hermes caches system-prompt assembly behind an `_invalidate_system_prompt()` hook called only on legitimate boundary events.
- **Do not mix `1h` and `5m` TTLs across nearby messages.** Stick to one per conversation unless you deeply understand the billing interaction.
- **OpenAI-compatible proxies vary.** Some forward `cache_control` through; some need it attached at the message level (`native_anthropic=False` path). Detect the mode once and branch.
- **Tool-call round trips use a lot of breakpoints.** The "last 3 non-system" rule works because tool results are short — if you inject a 100k-char tool result mid-conversation, you will bust the cache anyway.
