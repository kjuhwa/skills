---
name: rope-dynamic-ntk-scaling
description: RoPE with Dynamic NTK scaling to extend context beyond training max position length
category: model-architecture
version: 1.0.0
tags: [rope, positional-encoding, context-extension, transformer, attention]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/modules/minicpm4/model.py
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
---

# RoPE with Dynamic NTK scaling for extended sequence support

## When to use
Use this pattern when a transformer trained with a fixed max context length (e.g., 4096) needs to handle longer sequences (e.g., 8192+) at inference time without fine-tuning. Dynamic NTK scaling adjusts the RoPE frequency basis on-the-fly based on the ratio of actual sequence length to training max, reducing positional aliasing on out-of-distribution lengths.

## Pattern

### Standard RoPE frequencies (baseline)
```python
import math
import torch
import torch.nn as nn

class RotaryEmbedding(nn.Module):
    def __init__(self, dim: int, max_position_embeddings: int = 4096, base: float = 10000.0):
        super().__init__()
        self.dim = dim
        self.max_position_embeddings = max_position_embeddings
        self.base = base
        self._build_cache(max_position_embeddings)

    def _build_cache(self, seq_len: int):
        inv_freq = 1.0 / (self.base ** (torch.arange(0, self.dim, 2).float() / self.dim))
        self.register_buffer("inv_freq", inv_freq)
        t = torch.arange(seq_len, device=inv_freq.device).float()
        freqs = torch.outer(t, inv_freq)
        emb = torch.cat([freqs, freqs], dim=-1)
        self.register_buffer("cos_cached", emb.cos()[None, None, :, :])
        self.register_buffer("sin_cached", emb.sin()[None, None, :, :])
        self._seq_len_cached = seq_len
```

### Dynamic NTK scaling extension
When `seq_len > orig_max_pos`, recompute `inv_freq` with a scaled base:
```python
    def _maybe_rescale(self, seq_len: int, device):
        if seq_len <= self._seq_len_cached:
            return  # cache is still valid

        orig_max_pos = self.max_position_embeddings

        if seq_len > orig_max_pos:
            # Dynamic NTK: scale the frequency base
            scale = seq_len / orig_max_pos
            scaling_factor = math.sqrt(1 + math.log(scale) / math.log(orig_max_pos))
            new_base = self.base * scaling_factor
        else:
            new_base = self.base

        inv_freq = 1.0 / (new_base ** (torch.arange(0, self.dim, 2, device=device).float() / self.dim))
        self.inv_freq = inv_freq  # update in place

        t = torch.arange(seq_len, device=device).float()
        freqs = torch.outer(t, inv_freq)
        emb = torch.cat([freqs, freqs], dim=-1)
        self.cos_cached = emb.cos()[None, None, :, :]
        self.sin_cached = emb.sin()[None, None, :, :]
        self._seq_len_cached = seq_len

    def forward(self, x: torch.Tensor, seq_len: int):
        self._maybe_rescale(seq_len, x.device)
        return (
            self.cos_cached[:, :, :seq_len, :].to(x.dtype),
            self.sin_cached[:, :, :seq_len, :].to(x.dtype),
        )
```

### Apply RoPE in attention
```python
def rotate_half(x: torch.Tensor) -> torch.Tensor:
    x1, x2 = x.chunk(2, dim=-1)
    return torch.cat([-x2, x1], dim=-1)

def apply_rotary_emb(q, k, cos, sin):
    q_embed = q * cos + rotate_half(q) * sin
    k_embed = k * cos + rotate_half(k) * sin
    return q_embed, k_embed

# In attention forward:
cos, sin = self.rotary_emb(q, seq_len=q.shape[-2])
q, k = apply_rotary_emb(q, k, cos, sin)
```

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/modules/minicpm4/model.py:28-77` — full Dynamic NTK RoPE implementation including `scaling_factor` computation and cache invalidation

## Notes
- The scaling formula `sqrt(1 + log(scale) / log(orig_max_pos))` is specific to the Dynamic NTK variant used in MiniCPM4; other variants (Linear, YaRN) use different scaling functions.
- Cache invalidation is seq_len-based, not step-based; the cache grows monotonically during a session, which is memory-safe.
- At `seq_len == orig_max_pos`, `scale=1` and `log(scale)=0`, so `scaling_factor=1` and the formula degenerates to standard RoPE — no discontinuity.
