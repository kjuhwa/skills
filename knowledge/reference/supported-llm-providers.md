---
version: 0.1.0-draft
name: supported-llm-providers
summary: Catalog of LLM connection types in Craft Agents and which SDK (Claude or Pi) handles each — helps when adding a new provider or debugging why a model shows up under the wrong backend.
category: reference
tags: [llm, providers, claude-agent-sdk, pi-sdk]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: README.md
imported_at: 2026-04-18T00:00:00Z
---

# Supported LLM providers

### Direct connections

| Provider | Auth | Backend | Notes |
|---|---|---|---|
| Anthropic | API key OR Claude Max/Pro OAuth | Claude SDK | Direct via `@anthropic-ai/claude-agent-sdk`. |
| Google AI Studio | API key | Pi SDK | Native Google Search grounding built in. |
| ChatGPT Plus / Pro | Codex OAuth | Pi SDK | Uses OpenAI's Codex models under the user's ChatGPT subscription. |
| GitHub Copilot | OAuth (device code) | Pi SDK | One-click auth with Copilot subscription. |

### Anthropic-compatible endpoints (Claude SDK backend)
These reuse the Claude SDK by setting `ANTHROPIC_BASE_URL`:

| Provider | Endpoint | Notes |
|---|---|---|
| OpenRouter | `https://openrouter.ai/api` | Routes to Claude/GPT/Llama/Gemini by model slug `provider/model-name`. |
| Vercel AI Gateway | `https://ai-gateway.vercel.sh` | Built-in observability/caching. |
| Ollama | `http://localhost:11434` | Local open-source models, no API key. |
| Custom | any URL | Any Anthropic-compatible or OpenAI-compatible endpoint. |

### OpenAI (via Pi SDK backend)
OpenAI API key connections go through Pi's provider infrastructure, not directly. Letting you bring an OpenAI key and use GPT-4o/etc.

### Routing rules
1. `providerType` in the stored `LlmConnection` picks the backend:
   - `anthropic` → Claude SDK
   - `openai`, `google`, `chatgpt-oauth`, `copilot-oauth` → Pi SDK
2. `authType` picks how credentials are retrieved:
   - `apiKey` — value in encrypted `credentials.enc`.
   - `oauth` — access/refresh token pair in `credentials.enc`, refreshed on expiry.
   - `claudeMax` — Claude Max/Pro OAuth via `@anthropic-ai/claude-agent-sdk`'s own flow.
3. For Anthropic-compatible endpoints, `baseUrl` is persisted; `resolveAuthEnvVars` sets `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` before any SDK instantiation.

### Adding a new provider
1. Pick the backend (Claude vs Pi) based on the native API shape.
2. Add to the `providerType` enum in `packages/shared/src/config/llm-connections.ts`.
3. Add credential resolution in `resolveAuthEnvVars`.
4. If Pi: add to `pi-agent-server`'s `model-resolution.ts`.
5. If custom-endpoint for Claude SDK: add endpoint hint in UI, nothing else.

### Reference
- `packages/shared/src/config/llm-connections.ts` — connection model.
- `packages/shared/src/agent/backend/factory.ts` — routing.
- `packages/shared/src/agent/backend/internal/drivers/anthropic.ts`, `.../pi.ts` — per-backend resolution.
