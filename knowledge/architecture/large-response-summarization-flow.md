---
version: 0.1.0-draft
name: large-response-summarization-flow
summary: When a tool result exceeds ~60KB (15k tokens), Craft Agents saves it to sessionDir/long_responses, runs Haiku summarization with the tool's _intent as context, and returns summary + file path to the LLM — the UX win is the agent keeps context while the dev saves tokens.
category: architecture
tags: [summarization, large-response, cost-control, haiku]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/utils/large-response.ts
imported_at: 2026-04-18T00:00:00Z
---

# Large response summarization flow

### Motivation
Tool calls can return wildly variable output sizes. A single `gmail search` can easily return 200KB of raw JSON. Pushing that into the primary LLM's context is wasteful (token cost, context window pressure) and often pollutes the model's attention with irrelevant fields.

### Flow
1. After any tool runs, compute `estimateTokens = ceil(text.length / 4)`.
2. If under `TOKEN_LIMIT` (15_000 tokens ≈ 60KB): return raw.
3. If binary (base64 image, PDF, Office doc — detected via magic bytes): save directly with correct extension, return reference + metadata.
4. Else: save to `<sessionDir>/long_responses/<YYYY-MM-DD>_<tool-name>.<ext>`.
5. If text ≤ `MAX_SUMMARIZATION_INPUT` (100_000 tokens ≈ 400KB): run Haiku-class mini-completion with:
   - The tool's `_intent` field (see `mcp-tool-intent-metadata-injection`).
   - The full response.
   - Prompt: "Summarize this tool output focused on the stated intent. Preserve IDs, counts, and specifics; drop boilerplate."
6. If text > summarization limit: skip LLM, return head+tail preview.
7. Return to agent as tool result:
   ```
   <summary text>
   
   Full response saved to: long_responses/2026-03-10_gmail_users_me.json (412.3 KB)
   Use Read/Grep to inspect details.
   ```

### Why this works
- Agent still has full access via `Read`/`Grep` on the saved file for deeper inspection.
- Summarization sees the INTENT (`_intent` field the calling agent populated via metadata injection), so it summarizes on-target.
- Haiku is ~1/30th the cost of Opus; making this the default is a big token win.
- Saved files let users debug "why did the agent conclude X?" by opening the raw response.

### Portability
Saved file paths are stored as relative (`long_responses/...`), not absolute, and session JSONL uses `{{SESSION_PATH}}` tokens — the whole session dir moves cleanly.

### Knobs
- `TOKEN_LIMIT`: too low and you waste Haiku calls; too high and you spike Opus context. 15k is the app's current balance.
- `MAX_SUMMARIZATION_INPUT`: tune based on Haiku's context. The head+tail preview path is the graceful degradation for outliers.

### Reference
- `packages/shared/src/utils/large-response.ts`
- `packages/shared/src/utils/binary-detection.ts`
- `packages/shared/src/utils/summarize.ts`
