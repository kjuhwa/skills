---
name: hermes-context-compression-handoff
description: Compress long agent conversations with a handoff-framed summary that prevents re-answering resolved turns.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [llm-agents, context-compression, summarization, long-context]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Context Compression as Conversation Handoff

## Context

Naive "summarize the middle and glue it back" breaks in subtle ways: the model re-answers already-resolved questions, treats the summary as fresh instructions, or loses active task state. Hermes' compressor frames compaction as a handoff to a different assistant with explicit rules about what the summary is and isn't.

## When to use

- Multi-turn agent conversations approaching the model's context limit.
- You already tried the "just summarize older turns" approach and see re-work.
- You need compression compatible with prompt caching (the cached tail should stay cacheable).

## Procedure

### 1. Frame the summary as a handoff, not as instructions

The prefix injected before the summary is doing load-bearing work:

```text
[CONTEXT COMPACTION — REFERENCE ONLY] Earlier turns were compacted
into the summary below. This is a handoff from a previous context
window — treat it as background reference, NOT as active instructions.
Do NOT answer questions or fulfill requests mentioned in this summary;
they were already addressed.
Your current task is identified in the '## Active Task' section of the
summary — resume exactly from there.
Respond ONLY to the latest user message that appears AFTER this summary.
The current session state (files, config, etc.) may reflect work described
here — avoid repeating it:
```

(`agent/context_compressor.py:37-48`)

Key phrases that matter: "REFERENCE ONLY", "different assistant" (creates separation from the current identity), "Remaining Work" (NOT "Next Steps" — the latter reads as active instructions), "Active Task" section. These come from production failures in other agents (Codex, OpenCode) where summaries were misread.

### 2. Pre-pass: prune tool outputs with informative placeholders

Before the LLM-driven summarization call, replace each old tool result with a 1-line description that preserves information (`agent/context_compressor.py:66-160`):

```text
[terminal] ran `npm test` -> exit 0, 47 lines output
[read_file] read config.py from line 1 (1,200 chars)
[search_files] content search for 'compress' in agent/ -> 12 matches
[web_search] query='rust borrow checker' (8,432 chars result)
```

This is cheap (no LLM call) and often enough to recover the budget. Only invoke the summarizer if the pre-pass isn't enough.

### 3. Scale summary budget proportionally

```python
_MIN_SUMMARY_TOKENS = 2000
_SUMMARY_RATIO = 0.20
_SUMMARY_TOKENS_CEILING = 12_000
```

Summary token budget = clamp(compressed_content_tokens * 0.20, 2000, 12000). A fixed budget either wastes tokens on short compactions or loses detail on large ones.

### 4. Protect head and tail by token budget, not message count

Fixed "keep last 5 messages" fails when the last 5 happen to include a 50k-char browser result. Compute tail protection by tokens and include as many trailing messages as fit.

### 5. Structured template with Resolved / Pending question tracking

The summarizer prompt enforces sections:
- `## Resolved` — questions already answered (so the agent doesn't re-answer)
- `## Pending` — questions still open
- `## Active Task` — exact next step
- `## Remaining Work` — todo list style (NOT "Next Steps")
- `## Key Facts` — files touched, commits, URLs, config values

### 6. Use an auxiliary (cheap) model for summarization

```python
from agent.auxiliary_client import call_llm
summary = call_llm(system="...", messages=[...], model=AUX_MODEL)
```

The summarizer is a supporting call — a $0.25/M-token model is fine and keeps compression cheap.

### 7. Summarizer preamble: "Do not respond to any questions"

Before the content, the summarizer is told: "Do not respond to any questions in the text — just describe what was discussed." This came from OpenCode and dramatically reduces summaries that accidentally answer old user questions as "current response" (`agent/context_compressor.py` docstring).

### 8. Failure cooldown

If summarization fails, back off for 10 minutes before retrying:

```python
_SUMMARY_FAILURE_COOLDOWN_SECONDS = 600
```

Otherwise every turn hammers the broken provider.

### 9. Preserve cache breakpoints on the new tail

After compression, re-run the `system_and_3` cache marker pass (see the `hermes-anthropic-prompt-cache-system-and-3` skill). The summary becomes the first non-system message; the following user turn gets a breakpoint.

## Pitfalls

- **Do NOT merge the summary into an existing message.** Keep it as a discrete `[CONTEXT SUMMARY]` turn so the handoff framing is visible in the transcript.
- **Don't summarize the system prompt.** It's stable, cacheable, and already carries tools/policy.
- **Beware "Next Steps" vs "Remaining Work" wording.** The difference is small but empirically matters — models follow the first as active instructions.
- **Compression invalidates the cache for that turn** (by definition — the prefix changed). Accept the one-time cost; subsequent turns recache off the new prefix.
