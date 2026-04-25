---
version: 0.1.0-draft
name: dual-backend-claude-and-pi
summary: Why Craft Agents runs two AgentBackend implementations (Claude SDK + Pi SDK) side by side instead of a single abstraction — different provider ergonomics, auth flows, and model capabilities.
category: architecture
tags: [agent-sdk, pi-sdk, backend, provider-routing]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/agent/backend
imported_at: 2026-04-18T00:00:00Z
---

# Dual backend: Claude Agent SDK + Pi SDK

Craft Agents deliberately runs two separate agent backends behind one `AgentBackend` interface (`packages/shared/src/agent/backend/types.ts`):

1. **Claude backend** (`claude-agent.ts`) wraps `@anthropic-ai/claude-agent-sdk`. Handles: Anthropic API key, Claude Max/Pro OAuth, and every Anthropic-compatible endpoint (OpenRouter, Vercel AI Gateway, Ollama, custom) via `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` swap.
2. **Pi backend** (`pi-agent.ts`) wraps `@mariozechner/pi-ai` / `@mariozechner/pi-coding-agent`. Handles: Google AI Studio API keys, ChatGPT Plus via Codex OAuth, GitHub Copilot OAuth (device-code flow), OpenAI API keys.

### Why not one abstraction?

The two SDKs have fundamentally different event models (Claude streams `message_delta` + `tool_use`; Pi emits its own shape) and their capability matrices overlap only partially (tool use, vision, extended thinking are supported differently). Trying to unify them at the raw-event level erases useful provider-specific features; instead, the app unifies at the **event adapter** layer (`backend/claude/event-adapter.ts`, `backend/pi/event-adapter.ts`), both emitting the app's canonical `AgentEvent`.

### Driver registry

`packages/shared/src/agent/backend/factory.ts` keeps a `DRIVER_REGISTRY: Record<AgentProvider, ProviderDriver>` that's a thin dispatch table. New providers attach as drivers, not forks of the agent class.

### Trade-offs

- **Duplication**: session tool parity has to be tested separately (`session-tool-parity.test.ts` exists in BOTH backends) because mocks can't cover the real SDK event stream.
- **Bundle size**: both SDKs ship. The Pi SDK is ESM-only, which forces the `bun build --target=bun --format=esm` + `--external koffi` workaround (see `scripts/electron-build-main.ts`).
- **Provider routing**: `resolveAuthEnvVars()` in `config/llm-connections.ts` is the single place where "what env does this provider need" is decided. Any new provider touches only this function + one driver.

### Takeaway

When you can't get meaningful unification from an abstraction, let the duplication live at the adapter boundary. The price is two test surfaces; the benefit is clean provider-specific code.
