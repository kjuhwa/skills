---
version: 0.1.0-draft
name: multimodal-loss-mask-strategy
summary: VoxCPM training masks out loss on text and reference audio regions; only target audio patches contribute to the gradient
category: training
tags: [training, loss-mask, multimodal, tts, fine-tuning]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/training/packers.py
imported_at: 2026-04-18T00:00:00Z
---

# Loss mask zeroes text and ref_audio regions; only target audio contributes to loss

VoxCPM's training pipeline builds a flat sequence containing text tokens, reference audio patches, and target audio patches. A critical detail is the loss mask applied during gradient computation: only the target audio region has `loss_mask=1`; all other positions (text tokens, boundary special tokens, reference audio patches) are masked to 0.

The mask is computed in `packers.py` as a float tensor of shape `[seq_len]`. During the loss computation: `loss = (loss_per_token * loss_mask).sum() / loss_mask.sum()`. This ensures the model learns only to predict target audio — not to reconstruct the input text or the reference audio it was given as context.

Incorrect masking is a common and silent training failure mode. If the reference audio region is accidentally set to `loss_mask=1`, the model will learn to "reconstruct" reference audio it already has access to in context, a form of shortcut learning that leads to a model that can only clone voices it memorized in training rather than generalizing to new speakers.

## Why it matters
When writing a custom packer or data loader for VoxCPM fine-tuning, verify the loss mask independently — log `loss_mask.sum()` per sample and ensure it equals exactly `len(target_audio_patches)`. Any deviation indicates a masking bug that will silently corrupt training.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/training/packers.py:73-150+` — `loss_mask` construction showing the zeroing of text and ref_audio regions and the setting of target audio to 1.0
