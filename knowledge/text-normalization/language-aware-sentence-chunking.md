---
version: 0.1.0-draft
name: language-aware-sentence-chunking
summary: VoxCPM chunks long input text by language-specific punctuation with a token budget, merging short sentences to avoid OOM
category: text-normalization
tags: [text-normalization, chunking, tts, multilingual, batch]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/utils/text_normalize.py
imported_at: 2026-04-18T00:00:00Z
---

# Budget-aware sentence chunking for batch TTS

VoxCPM's text preprocessing pipeline splits long input paragraphs into chunks before feeding them to the TTS model, using language-aware rules to avoid context-length overflows and OOM errors. For Chinese (CJK) text, splitting is done on Chinese punctuation (`。！？；…`) and the budget is measured in character count (since Chinese has no word spaces). For English and other Latin-script languages, splitting is done on sentence-ending punctuation (`.!?;`) and the budget is measured in approximate word count.

The `split_paragraph` function enforces a `token_max_n` budget: if adding the next sentence would exceed the budget, the current chunk is flushed and a new one begins. Sentences shorter than `merge_len` characters are not flushed as standalone chunks — they are merged into the next sentence instead. This prevents the model from receiving very short fragments (e.g., single words from mid-sentence splits) that produce unnatural prosody.

The approach is more efficient than padding everything to the worst-case `max_len` because variable-length chunks can be batched tightly without wasted computation on padding positions.

## Why it matters
Without this chunker, feeding a long article (1000+ characters) to VoxCPM directly causes CUDA OOM on typical VRAM budgets. The chunker is not just a convenience — it is load-bearing for production batch TTS. When adapting VoxCPM to a new language, the primary change needed is adding the language's sentence-ending punctuation to the split regex.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/utils/text_normalize.py:58-100+` — `split_paragraph()` with language detection, budget accounting, and merge-short-sentence logic
