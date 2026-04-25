---
name: static-preallocated-kv-cache
description: Static KV cache pre-allocated for all transformer layers, filled incrementally during generation
category: inference
version: 1.0.0
tags: [kv-cache, inference, transformer, memory, pytorch]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/modules/minicpm4/cache.py
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
---

# Static KV cache pre-allocated for all layers, filled incrementally

## When to use
Use this pattern for autoregressive generation when you want to avoid dynamic memory allocation per step (which triggers CUDA memory fragmentation and slows down long sequences). Pre-allocating the full KV cache at model load time and filling it with a position pointer gives predictable memory usage and avoids reallocation overhead during the hot generation loop.

Also works well with `torch.compile` because the tensor shapes are static.

## Pattern

### Cache data structure
```python
import torch
from dataclasses import dataclass
from typing import List, Tuple

@dataclass
class StaticKVCache:
    """
    Pre-allocated KV cache for all transformer layers.
    Shape: [2, num_layers, batch_size, num_heads, max_seq_len, head_dim]
    Index 0 = K, index 1 = V.
    """
    cache: torch.Tensor        # [2, num_layers, B, H, max_len, D]
    position: int = 0          # current fill position
    max_len: int = 0
    num_layers: int = 0

    @classmethod
    def allocate(
        cls,
        num_layers: int,
        batch_size: int,
        num_heads: int,
        max_seq_len: int,
        head_dim: int,
        device: torch.device,
        dtype: torch.dtype = torch.float16,
    ) -> "StaticKVCache":
        cache = torch.zeros(
            2, num_layers, batch_size, num_heads, max_seq_len, head_dim,
            device=device, dtype=dtype,
        )
        return cls(cache=cache, position=0, max_len=max_seq_len, num_layers=num_layers)
```

### Step and access methods
```python
    def step(self) -> None:
        """Advance the position counter by one after writing a new token."""
        if self.position >= self.max_len:
            raise OverflowError(
                f"KV cache overflow: position {self.position} >= max_len {self.max_len}"
            )
        self.position += 1

    def get_layer_cache(self, layer_idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        """Return (K, V) tensors for layer_idx, sliced to current position."""
        k = self.cache[0, layer_idx, :, :, :self.position, :]  # [B, H, pos, D]
        v = self.cache[1, layer_idx, :, :, :self.position, :]  # [B, H, pos, D]
        return k, v

    def write_layer(self, layer_idx: int, k: torch.Tensor, v: torch.Tensor) -> None:
        """Write K and V for a single new token at the current position."""
        self.cache[0, layer_idx, :, :, self.position, :] = k  # k: [B, H, D]
        self.cache[1, layer_idx, :, :, self.position, :] = v

    def fill_caches(self, kv_list: List[Tuple[torch.Tensor, torch.Tensor]]) -> None:
        """
        Bulk-fill the cache from a prompt prefix (e.g., after prompt_cache computation).
        kv_list: one (K, V) tuple per layer, each [B, H, T_prefix, D].
        """
        prefix_len = kv_list[0][0].shape[2]
        for layer_idx, (k, v) in enumerate(kv_list):
            self.cache[0, layer_idx, :, :, :prefix_len, :] = k
            self.cache[1, layer_idx, :, :, :prefix_len, :] = v
        self.position = prefix_len

    def reset(self) -> None:
        """Clear cache for reuse (e.g., new sequence)."""
        self.cache.zero_()
        self.position = 0
```

### Integration in autoregressive loop
```python
def generate(model, input_ids: torch.Tensor, max_new_tokens: int) -> torch.Tensor:
    cache = StaticKVCache.allocate(
        num_layers=model.config.num_layers,
        batch_size=input_ids.shape[0],
        num_heads=model.config.num_heads,
        max_seq_len=model.config.max_position_embeddings,
        head_dim=model.config.hidden_size // model.config.num_heads,
        device=input_ids.device,
    )

    # Prefill phase
    for layer_idx in range(model.config.num_layers):
        k, v = model.layers[layer_idx].compute_kv(input_ids)
        cache.write_layer(layer_idx, k[:, :, -1, :], v[:, :, -1, :])  # last token
    cache.step()

    # Decode phase
    generated = []
    curr_token = input_ids[:, -1:]
    for _ in range(max_new_tokens):
        logits = model.forward_one(curr_token, cache)
        curr_token = logits.argmax(dim=-1, keepdim=True)
        generated.append(curr_token)

        for layer_idx in range(model.config.num_layers):
            k, v = model.layers[layer_idx].compute_kv(curr_token)
            cache.write_layer(layer_idx, k.squeeze(2), v.squeeze(2))
        cache.step()

    return torch.cat(generated, dim=1)
```

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/modules/minicpm4/cache.py:1-48` — full StaticKVCache with `step()`, `get_layer_cache()`, `fill_caches()`, and overflow guard

## Notes
- Pre-allocate with `max_seq_len = training_max + generation_budget`; the cache is zeroed at init and never resized.
- `fill_caches()` is designed for the prompt-cache reuse pattern — call it once with precomputed KV from a reference prefix, then continue with `step()` in the decode loop.
- Do not use `.clone()` inside `get_layer_cache()` — the slice is already a view; cloning defeats the purpose of static allocation.
