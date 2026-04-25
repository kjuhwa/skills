---
name: platform-adapter-interface
description: Unify Slack/Telegram/Discord/GitHub/Web behind one `IPlatformAdapter` interface with sendMessage/ensureThread/getStreamingMode/getPlatformType/start/stop, plus an optional structured-event hook for web-only rich UI.
category: integration
version: 1.0.0
version_origin: extracted
tags: [adapter, plugin, multi-platform, interface, chat-bot]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
---

# Unified Platform Adapter Interface Across Chat + Forge + Web

## When to use

- You deliver AI-assistant responses through multiple surfaces: Slack threads, Telegram chats, Discord channels, GitHub issue/PR comments, a web UI with SSE streaming.
- You want one `IPlatformAdapter` interface so the core orchestrator doesn't know (or care) which platform it's talking to.
- You want to share common logic (message splitting, auth, retry) at the edge and keep the business core free of platform branching.

## Steps

1. **Name the shared concepts in the interface**, not platform details:

   ```ts
   interface IPlatformAdapter {
     sendMessage(conversationId: string, message: string, metadata?: MessageMetadata): Promise<void>;
     ensureThread(originalConversationId: string, messageContext?: unknown): Promise<string>;
     getStreamingMode(): 'stream' | 'batch';
     getPlatformType(): string; // 'telegram' | 'github' | 'slack' | 'discord' | 'web'
     start(): Promise<void>;
     stop(): void;
     sendStructuredEvent?(conversationId: string, event: MessageChunk): Promise<void>;  // optional
     emitRetract?(conversationId: string): Promise<void>;                               // optional
   }
   ```

   The core uses `getStreamingMode()` to decide between per-chunk and per-turn delivery (Slack/GitHub want "batch"; Telegram and Web want "stream"). `ensureThread` abstracts the platform-specific "respond in a thread" semantics — on GitHub and Slack it's a no-op that returns the same conversation ID; on Telegram it's a thread-creation call if needed.

2. **Encode platform-specific conversation IDs as strings** and document the format per platform:
   - Slack: `thread_ts` (string)
   - Telegram: `chat_id` (stringified number)
   - GitHub: `owner/repo#number`
   - Web: arbitrary UUID
   - Discord: channel ID

3. **Use a discriminated-union `MessageChunk` type** for the structured event hook:

   ```ts
   type MessageChunk =
     | { type: 'assistant'; content: string }
     | { type: 'system'; content: string }
     | { type: 'thinking'; content: string }
     | { type: 'result'; sessionId?: string; tokens?: TokenUsage; … }
     | { type: 'rate_limit'; rateLimitInfo: … }
     | …;
   ```

   Adapters that don't support rich display simply don't implement `sendStructuredEvent` (it's optional). Adapters that do (`web`) implement both `sendMessage` (for prose) and `sendStructuredEvent` (for rich cards).

4. **Extend, don't widen, for platform-specific surfaces.** Web needs setup-event-bridge, set-conversation-db-id, emit-lock-event — none of those make sense on Slack. Put them in a subinterface:

   ```ts
   interface IWebPlatformAdapter extends IPlatformAdapter {
     sendStructuredEvent(conversationId: string, event: MessageChunk): Promise<void>;
     setConversationDbId(platformConversationId: string, dbId: string): void;
     setupEventBridge(...): () => void;
     emitLockEvent(...): Promise<void>;
     registerOutputCallback(...): void;
     removeOutputCallback(...): void;
   }
   ```

   Provide a narrow type guard:

   ```ts
   export function isWebAdapter(a: IPlatformAdapter): a is IWebPlatformAdapter {
     return a.getPlatformType() === 'web';
   }
   ```

5. **Encapsulate auth inside each adapter**, not at the router. Each adapter parses its allowed-users env var in the constructor (`TELEGRAM_ALLOWED_USER_IDS`, GitHub username whitelist) and **silently rejects** unauthorized senders (no error response, just a masked-username log). This keeps the core free of per-platform auth branches.

6. **Each adapter exposes an `onMessage(handler)` callback**. The outer code registers a single handler that receives `{ conversationId, message, attachedFiles, … }` and returns a Promise. Errors propagate — adapters don't swallow them.

7. **Share message-splitting utilities** via a side module (`packages/adapters/src/utils/message-splitting.ts`). Every chat platform has a max-length limit (Slack 40k, Telegram 4096, Discord 2000) so the util lives in one place.

## Counter / Caveats

- Resist making the interface "smart." It is a **transport** abstraction. Business logic (streaming cadence decision, retry, deduplication) belongs in the core, not in adapters.
- `ensureThread` is messy: on platforms where threading is automatic (GitHub) it's a no-op; on Slack it's implicit from `thread_ts` on the triggering message; on Telegram it may need an explicit chat creation. Document each platform's semantics.
- `getStreamingMode()` is a string union literal, not an enum — keeps the interface zero-cost. If you add a third mode ("chunked-with-retract"), add it here before implementing.
- `stop()` is synchronous in the interface; some adapters need to await shutdown. Archon accepts "stop initiates teardown, full cleanup is best-effort"; if your adapters need guaranteed-awaited shutdown, make it `Promise<void>`.

## Evidence

- `packages/core/src/types/index.ts:118-163`: full `IPlatformAdapter` declaration.
- `packages/core/src/types/index.ts:165-184`: `IWebPlatformAdapter` + `isWebAdapter` type guard.
- Implementations at `packages/adapters/src/chat/slack/adapter.ts`, `…/chat/telegram/adapter.ts`, `…/forge/github/adapter.ts`, `…/community/chat/discord/adapter.ts`, `packages/server/src/adapters/web.ts`.
- Shared message-splitting util at `packages/adapters/src/utils/message-splitting.ts`.
- Root `CLAUDE.md` lines 422-438 document the pattern and per-platform conversation-ID semantics.
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
