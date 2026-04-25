---
version: 0.1.0-draft
name: chinese-multichar-token-char-splitter
summary: VoxCPM wraps the tokenizer to split multi-character Chinese tokens back to single characters for per-character TTS pronunciation granularity
category: tokenizer
tags: [tokenizer, chinese, tts, llama, character-level]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/model/utils.py
imported_at: 2026-04-18T00:00:00Z
---

# Split multi-char Chinese tokens to single chars for TTS consistency

VoxCPM uses a LLaMA-based tokenizer that may merge common Chinese character sequences into single tokens. For example, `"你好"` (hello) might be tokenized as a single token rather than two separate character tokens. For text-to-speech, this is problematic: the model learns to associate audio patches with individual character pronunciations, so a fused two-character token receives a single audio allocation that then needs to be split, creating inconsistent alignment.

`CharTokenizerWrapper` in `src/voxcpm/model/utils.py` solves this by post-processing the tokenizer output: after encoding, it detects any tokens that decode to multiple Chinese characters (CJK Unicode range) and re-encodes each character individually. The result is a token sequence where each Chinese character always occupies exactly one token position, regardless of whether the base tokenizer would fuse them.

This wrapper is transparent to callers — it has the same interface as the underlying HuggingFace tokenizer (`encode()`, `decode()`, `__call__()`).

## Why it matters
Skipping the `CharTokenizerWrapper` when using a LLaMA tokenizer on Chinese TTS data is a subtle bug that manifests as inconsistent audio duration per character — some characters sound compressed or are skipped. This is especially noticeable in proper nouns and common two-character words (`"中国"`, `"北京"`, etc.) that appear frequently in tokenizer vocabulary.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/model/utils.py:16-120` — `CharTokenizerWrapper` class with CJK multi-char detection and single-character re-encoding
