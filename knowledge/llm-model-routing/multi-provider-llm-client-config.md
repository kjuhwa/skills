---
version: 0.1.0-draft
name: multi-provider-llm-client-config
summary: Tiered LLM client registry (mini / medium / high / large / persona / gemini) across OpenAI + Anthropic + OpenRouter, with prompt-cache retention and a shared usage-tracking callback for cost accounting.
category: llm-model-routing
confidence: high
tags: [langchain, llm-routing, prompt-caching, openai, anthropic, openrouter, usage-tracking]
source_type: extracted-from-git
source_url: https://github.com/BasedHardware/omi.git
source_ref: main
source_commit: 1c310f7fc4c37acf7e1bedb014e3a4adfd56546e
source_project: omi
imported_at: 2026-04-18T00:00:00Z
---

# Multi-Provider LLM Client Registry

Architecture for routing different workloads to different LLM tiers without scattering model names throughout the codebase. Everything lives in a single `clients.py` module, and the rest of the backend imports named handles (`llm_mini`, `llm_agent`, `llm_persona_medium_stream`, …).

## The tier table

| Handle                        | Model                               | Use-case                                   |
|-------------------------------|-------------------------------------|--------------------------------------------|
| `llm_mini` / `llm_mini_stream`| `gpt-4.1-mini`                      | Light tasks: classification, routing       |
| `llm_medium`                  | `gpt-5.2`                           | Default conversation processing            |
| `llm_high`                    | `o4-mini`                           | Reasoning-heavy tasks                      |
| `llm_large`                   | `o1-preview`                        | Hardest tasks, cost-tolerant               |
| `llm_agent` / `_stream`       | `gpt-5.1` + cache-retention 24h     | Agent loops (repeated prefix)              |
| `llm_persona_mini_stream`     | `google/gemini-flash-1.5-8b` via OpenRouter | Cheap persona chat      |
| `llm_persona_medium_stream`   | `anthropic/claude-3.5-sonnet` via OpenRouter | Higher-quality persona chat |
| `llm_gemini_flash`            | `google/gemini-3-flash-preview` via OpenRouter | Long-context summarisation |
| `anthropic_client`            | `claude-sonnet-4-6` direct SDK      | Tool-use agents                            |

## Patterns worth copying

1. **Name the handle, not the model.** Callers say `llm_agent.invoke(...)` — swapping `gpt-5.1 → gpt-5.3` is a one-line change.
2. **Streaming pair.** Every non-streaming handle has a `_stream` twin with `streaming=True, stream_options={"include_usage": True}`. Pick at the callsite.
3. **Prompt cache key** — `model_kwargs={"prompt_cache_key": "omi-agent-v1"}` pins agent calls to the same cache-machine for high prefix hit rates. Bump the suffix (`-v2`) when the system prompt changes materially.
4. **Cache retention hint** — `extra_body={"prompt_cache_retention": "24h"}` requests 24 h retention instead of the default 5 min; critical for agent loops that reuse the same 20 k-token prelude.
5. **OpenRouter as Anthropic/Gemini gateway** — set `base_url=https://openrouter.ai/api/v1` + `X-Title` header, keep the `ChatOpenAI` client class. Enables trying multiple Anthropic / Google models without new SDKs.
6. **Shared usage callback** — `_usage_callback = get_usage_callback()` injected into every client. Every call logs tokens → your usage store; no caller has to remember.
7. **Tiktoken for budget math** — `encoding_for_model('gpt-4')` is shared; `num_tokens_from_string(s)` lets routing logic count before dispatching.
8. **Embeddings + parser globals** — `embeddings = OpenAIEmbeddings("text-embedding-3-large")`, `parser = PydanticOutputParser(pydantic_object=Structured)` live here too; one place to swap embed model.

## When to pick which tier

- Folder assignment, news-check triage, first-pass tagging → `llm_mini`.
- Conversation summarisation, action-item extraction → `llm_medium`.
- Reasoning-chain inference, deep synthesis → `llm_high` / `llm_large`.
- Anything that re-sends the same long system prompt (agents, MCP tools) → `llm_agent` with cache.
- User-facing chat with personas → persona handles (via OpenRouter for Anthropic models).
- Wrapped / long-context batch jobs → `llm_gemini_flash`.

## Evidence in source

- `backend/utils/llm/clients.py` — full registry
- `backend/utils/llm/conversation_processing.py` — picks `llm_mini` for cheap classification
- `backend/tests/unit/test_prompt_cache_integration.py` — cache retention validation

## Reusability

Any app with mixed-workload LLM usage benefits from pinning model choices in one module. Pattern is framework-neutral (swap LangChain for native SDKs and the structure still holds). Keep the cache key + usage callback + streaming-twin conventions — they compound as the product grows.
