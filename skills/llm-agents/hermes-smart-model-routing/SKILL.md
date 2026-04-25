---
name: hermes-smart-model-routing
description: Route simple user messages to a cheap model with conservative keyword/length heuristics.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [llm-agents, model-routing, cost-optimization, heuristics]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Cheap-vs-Strong Model Routing

## Context

Many agent turns don't need the flagship model — "what time is it?", "hi", "thanks" are fine on a cheap model. But misrouting a coding question to a cheap model burns trust fast. Hermes' router is deliberately conservative: if *any* signal hints at code/tool/long-form work, stay on the strong model.

## When to use

- You have a strong primary model and a cheap auxiliary.
- You want to save money on the long tail of trivial turns without risking quality on real work.

## Procedure

### 1. Keyword stop-list

Any of these words anywhere in the user message means "do NOT route to cheap":

```python
_COMPLEX_KEYWORDS = {
    "debug", "debugging", "implement", "implementation",
    "refactor", "patch", "traceback", "stacktrace",
    "exception", "error", "analyze", "analysis",
    "investigate", "architecture", "design", "compare",
    "benchmark", "optimize", "optimise", "review",
    "terminal", "shell", "tool", "tools", "pytest",
    "test", "tests", "plan", "planning", "delegate",
    "subagent", "cron", "docker", "kubernetes",
}
```

(`agent/smart_model_routing.py:11-46`)

### 2. Structural filters

```python
max_chars = cfg.get("max_simple_chars", 160)
max_words = cfg.get("max_simple_words", 28)

if len(text) > max_chars: return None
if len(text.split()) > max_words: return None
if text.count("\n") > 1: return None              # multi-line = probably code
if "```" in text or "`" in text: return None      # code fences / inline code
if _URL_RE.search(text): return None              # URL = probably web-research
```

All of these stay on the strong model. The "no backticks" rule is crucial — even a single backtick means the user is showing code.

### 3. Cheap model config shape

```yaml
smart_model_routing:
  enabled: true
  max_simple_chars: 160
  max_simple_words: 28
  cheap_model:
    provider: openrouter
    model: "meta-llama/llama-3.1-8b-instruct"
```

If `provider` or `model` is missing, routing is off — fail safe.

### 4. Per-turn resolution, not per-session

Call `resolve_turn_route(user_message, smart_routing_cfg, primary_runtime)` fresh each turn. Don't cache — the same user alternates between small talk and real work.

### 5. Return a complete runtime

The route returns not just a model ID but an entire `{model, api_key, base_url, provider, api_mode, command, args}` tuple. The caller uses this to construct the LLM client — no provider-context mismatch.

### 6. Ignore for first-turn tool-use loops

After the first API call, if the model has any tool calls, force back to the strong model for the remaining iterations. Cheap models often stumble on tool-call JSON formatting. (Hermes' `AIAgent` handles this by only consulting the router on the first message of a turn.)

## Pitfalls

- **Don't route based on message length alone.** "fix the auth bug" is 16 chars but needs the strong model.
- **Don't add "simple" or "quick" to the keyword list.** Users say those about complex tasks all the time.
- **Keep the keyword set small and English-only, or extend it deliberately.** False negatives are cheap ("routed to cheap unnecessarily"); false positives hurt trust.
- **Measure the hit rate** — if >40% of turns route cheap, something's too permissive.
