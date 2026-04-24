---
name: audio-text-packing-with-loss-masks
description: Pack text and audio tokens with per-region loss masks for multimodal sequence training
category: training
version: 1.0.0
tags: [training, multimodal, packing, loss-mask, tts]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/training/packers.py
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
---

# Pack text + audio tokens with per-region loss masks for multimodal training

## When to use
Use this pattern when training a language model that generates audio latents conditioned on text. The key challenge is building a flat token sequence from heterogeneous modalities (text ids, audio patches, special boundary tokens) with a correct loss mask that prevents the model from learning to reproduce the reference audio prefix or the input text — only the target audio should contribute to the loss.

## Pattern

### Special token IDs
VoxCPM uses four boundary tokens to delimit regions in the sequence:
```python
TEXT_START_TOKEN  = 101  # <text_start>
TEXT_END_TOKEN    = 102  # <text_end>
AUDIO_START_TOKEN = 103  # <audio_start>
AUDIO_END_TOKEN   = 104  # <audio_end>
```

### Sequence layout
```
[TEXT_START] [text_ids...] [TEXT_END] [AUDIO_START] [ref_audio_patches...] [target_audio_patches...] [AUDIO_END]
loss_mask:      0              0           0                  0                        1                    0
```

### Packer implementation
```python
import torch
from typing import Optional

def pack_text_audio(
    text_ids: list[int],
    ref_audio_patches: torch.Tensor,    # [T_ref, D] — reference audio (voice clone source)
    target_audio_patches: torch.Tensor, # [T_tgt, D] — target audio to generate
    max_len: int = 2048,
    audio_vae=None,
) -> dict:
    """
    Build a packed sequence with three masks:
      text_mask:  1 where text tokens are
      audio_mask: 1 where audio patches are (ref + target)
      loss_mask:  1 only on target audio patches
    """
    # Build the flat token / patch sequence as a list of segments
    text_segment  = [TEXT_START_TOKEN] + text_ids + [TEXT_END_TOKEN]
    audio_segment_ref = [AUDIO_START_TOKEN] + list(range(len(ref_audio_patches)))
    audio_segment_tgt = list(range(len(target_audio_patches))) + [AUDIO_END_TOKEN]

    seq_len = len(text_segment) + len(ref_audio_patches) + len(target_audio_patches) + 2  # +2 for AUDIO_START/END

    # Build masks (all zeros, then fill regions)
    text_mask  = torch.zeros(seq_len, dtype=torch.bool)
    audio_mask = torch.zeros(seq_len, dtype=torch.bool)
    loss_mask  = torch.zeros(seq_len, dtype=torch.float)

    # Text region (includes boundary tokens — masked out)
    text_start_idx = 0
    text_end_idx   = len(text_segment)
    text_mask[text_start_idx:text_end_idx] = True

    # Reference audio region — audio_mask True, loss_mask stays 0
    ref_start = text_end_idx + 1  # after AUDIO_START
    ref_end   = ref_start + len(ref_audio_patches)
    audio_mask[ref_start:ref_end] = True

    # Target audio region — both audio_mask and loss_mask True
    tgt_start = ref_end
    tgt_end   = tgt_start + len(target_audio_patches)
    audio_mask[tgt_start:tgt_end] = True
    loss_mask[tgt_start:tgt_end]  = 1.0

    return {
        "text_ids":      text_ids,
        "ref_patches":   ref_audio_patches,
        "target_patches": target_audio_patches,
        "text_mask":     text_mask,
        "audio_mask":    audio_mask,
        "loss_mask":     loss_mask,
        "seq_len":       seq_len,
    }
```

### Loss computation
```python
def compute_masked_loss(logits_or_pred, targets, loss_mask):
    """Apply loss mask — only target audio contributes."""
    loss_per_token = F.mse_loss(logits_or_pred, targets, reduction="none")  # [B, T, D]
    loss_per_token = loss_per_token.mean(dim=-1)                            # [B, T]
    masked_loss = (loss_per_token * loss_mask).sum() / loss_mask.sum().clamp(min=1)
    return masked_loss
```

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/training/packers.py:1-150+` — full packer with AudioVAE encode, special token insertion, and three mask construction

## Notes
- The reference audio region must be zeroed in `loss_mask`; if mistakenly set to 1, the model learns to copy the reference instead of generating target speech.
- Pad all sequences to `max_len` with a padding mask before batching; the loss mask should be 0 on padding positions.
- Special tokens 101–104 must be reserved in the tokenizer vocabulary and never used as regular text tokens.
