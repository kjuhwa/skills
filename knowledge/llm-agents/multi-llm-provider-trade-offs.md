---
version: 0.1.0-draft
name: multi-llm-provider-trade-offs
summary: OpenSRE supports 8 LLM providers (Anthropic native, OpenAI, OpenRouter, Gemini, NVIDIA NIM, Minimax, Ollama, Bedrock) by routing through one of three client classes (Anthropic, OpenAI-compatible, Bedrock-via-Anthropic-SDK) — a useful pattern for cross-provider portability with provider-specific quirks contained.
category: llm-model-routing
tags: [llm, providers, anthropic, openai, ollama, bedrock]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/services/llm_client.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# Multi-LLM Provider Trade-offs in OpenSRE

## The three client classes
1. **`LLMClient`** — Anthropic native via `anthropic.Anthropic`. Used by default.
2. **`OpenAILLMClient`** — `openai.OpenAI` SDK. Powers OpenAI direct, OpenRouter, Gemini, NVIDIA NIM, Minimax, Ollama (all OpenAI-compatible HTTP APIs). Each provider differs only in `base_url`, `api_key_env`, optional `api_key_default` (Ollama), and required temperature (Minimax forces 1.0).
3. **`BedrockLLMClient`** — `anthropic.AnthropicBedrock` (Claude on AWS Bedrock with IAM auth, no API key).

## Provider selection
Single env var: `LLM_PROVIDER` ∈ `{anthropic, openai, openrouter, gemini, nvidia, minimax, ollama, bedrock}`. Default: anthropic.

## Reasoning vs tool-call models
Two model tiers per provider:
- **Reasoning** (e.g. Claude Opus, GPT-4o) — root cause diagnosis, multi-step analysis, claim validation.
- **Tool-call** (e.g. Claude Haiku, GPT-4o mini) — tool selection, action planning, lightweight routing.

Two singletons (`_llm`, `_llm_for_tools`) cached per process; `reset_llm_singletons()` for tests.

## Provider-specific quirks
- **OpenAI o1/o3/o4/gpt-5*** — require `max_completion_tokens` instead of `max_tokens`. Detected by `_uses_max_completion_tokens(model)`.
- **Bedrock** — IAM via `AWS_REGION`; no API key flow.
- **Ollama** — needs a placeholder API key (`"ollama"`) because the OpenAI SDK refuses an empty key.
- **Minimax** — requires `temperature=1.0` because the API errors otherwise.

## API key resolution
Every provider goes through `resolve_llm_api_key(env_var)`: env first, then OS keychain (via `keyring`), with `<APP>_DISABLE_KEYRING=1` to skip keychain entirely (Docker/CI).

## Trade-offs summary
- Pro: Users can switch providers with one env var; no code changes.
- Pro: Different reasoning/toolcall tiers reduce cost; pair Haiku for planning + Opus for diagnosis.
- Con: Provider quirks (max_completion_tokens, temperature, key default) are scattered through the dispatcher; easy to miss when adding a new provider.
- Con: Native Anthropic vs OpenAI-compat split means structured-output behaviors differ subtly across providers.
