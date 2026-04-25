---
version: 0.1.0-draft
name: retry-badcase-token-ratio-heuristic
summary: VoxCPM retries generation when audio_tokens/text_tokens falls below a threshold (default 6.0), up to a configurable max retry count
category: inference
tags: [inference, retry, quality, heuristic, tts]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/model/voxcpm2.py
imported_at: 2026-04-18T00:00:00Z
---

# Retry-on-short-output heuristic via token-ratio threshold

VoxCPM2's generation loop includes a retry heuristic for detecting truncated or degenerate outputs. After generating, the model checks whether the ratio of generated audio tokens to input text tokens meets a minimum threshold (`retry_badcase_ratio_threshold`, default 6.0). If `audio_tokens / text_tokens < threshold`, the generation is considered bad and is retried with a different random seed, up to `retry_badcase_max_times` attempts.

The intuition is that a well-formed TTS output should produce significantly more audio tokens than input text tokens — each phoneme expands into multiple audio patches. A very short audio sequence relative to the input text indicates premature termination: the model generated a silence token or end-of-sequence too early, likely due to numerical instability or an unlucky sampling path.

Setting `retry_badcase_ratio_threshold=0.0` effectively disables the heuristic (all outputs accepted), which is necessary for deterministic inference (fixed seed, no retries). Very short inputs (single words) can legitimately produce low ratios, so consider reducing the threshold for short-text use cases.

## Why it matters
Without the retry heuristic, VoxCPM occasionally produces silent or clipped audio on short or unusual inputs, which is a poor user experience. The heuristic catches the majority of degenerate cases automatically. When debugging determinism issues in production, the retry mechanism is the first thing to disable — it introduces non-determinism even when the random seed is fixed, because retry count affects the overall random state.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/model/voxcpm2.py:700-850` — generation loop with `retry_badcase_ratio_threshold` check and retry counter
