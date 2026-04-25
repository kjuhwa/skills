---
version: 0.1.0-draft
name: langchain-pydantic-memory-curation
summary: Prompt-engineering playbook for LLM-based memory extraction from conversations, splitting SYSTEM (facts about the user) from INTERESTING (external wisdom with attribution) with strict quality filters.
category: conversation-memory-extraction
confidence: high
tags: [langchain, prompt-engineering, memory-extraction, pydantic-parser, personal-knowledge]
source_type: extracted-from-git
source_url: https://github.com/BasedHardware/omi.git
source_ref: main
source_commit: 1c310f7fc4c37acf7e1bedb014e3a4adfd56546e
source_project: omi
imported_at: 2026-04-18T00:00:00Z
---

# Conversation-to-Memory Extraction Prompt Design

A battle-tested approach to turning raw conversation transcripts into durable "memories" without drowning the user in trivia. The key move is splitting extracted items into two orthogonal categories with very different inclusion criteria, then enforcing them in the prompt itself (not in a post-filter).

## The two categories

- **SYSTEM memories** — facts *about* the user. Their opinions, realizations, network, actions, preferences. "User discovered their productive hours are 5–7 am."
- **INTERESTING memories** — external wisdom *from other people/sources* the user could learn from. Must include attribution. "Rockwell: talk to paying customers, 30% will be a real usecase."

The explicit test runs in-prompt:

- **Q1**: Is this wisdom/advice *from someone else* the user can learn from? → INTERESTING.
- **Q2**: Is it a fact *about* the user? → SYSTEM.
- **Neither**: don't extract.

## Why this works

- Without the split, LLMs over-collect user opinions as "insights," and the memory store devolves into noise.
- Attribution requirement on INTERESTING kills generic-wisdom junk ("exercise is good for health").
- Identity rules ("never create a new family member without explicit evidence") prevent hallucinated relationships after a single ambiguous reference.
- "Never use Speaker 0/1/2 in descriptions" forces the model to either resolve names (with a >90% confidence threshold) or phrase around them ("a colleague mentioned…"), which keeps downstream UIs clean.

## Prompt structure

1. **Role statement** — "expert memory curator."
2. **Critical context** — who the primary user is (`{user_name}`), scope limit (user + direct interlocutors).
3. **Identity rules** — never create new people without explicit evidence, match against existing memories.
4. **Workflow** — (1) read full convo, (2) resolve names, (3) run categorization test, (4) apply quality filters, (5) ensure conciseness.
5. **Categorization test** — the two Qs above.
6. **Good / bad examples** — 8 per category with ✅/❌ markers so the model doesn't invent edge cases.
7. **Legacy-to-new category mapping** — for migrations, remap old tags into the current `MemoryCategory` enum in post-processing via `LEGACY_TO_NEW_CATEGORY`.

## Structured output

- Use `PydanticOutputParser` on a `Memories` (or `MemoriesByTexts`) base model so the extractor returns typed objects, not stringly-typed JSON.
- Parser-injected `{format_instructions}` is essential — never remove it from the prompt template or output reverts to free-form JSON.

## Downstream integration

- `new_memories_extractor()` returns a validated `Memories` object ready to upsert into the store.
- On a legacy-tag migration, map old → new before storing so the existing UI filters keep working.
- Store + version the prompt in source control — this prompt is a product asset, not a string literal.

## Evidence in source

- `backend/utils/prompts.py` — `extract_memories_prompt` with full categorization + identity rules
- `backend/utils/llm/memories.py` — `Memories`, `MemoriesByTexts`, `new_memories_extractor()`, `LEGACY_TO_NEW_CATEGORY`
- `backend/database/memories.py` — persistence layer

## Reusability

Transferable to any personal-knowledge or journaling product (note-taking apps, research notebooks, customer-interview synthesizers) where the same user-vs-external split matters. Also applicable to meeting-recap tools where "things the team decided" (SYSTEM) vs. "things experts said" (INTERESTING) are different surfaces.
