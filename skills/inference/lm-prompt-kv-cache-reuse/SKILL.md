---
name: lm-prompt-kv-cache-reuse
description: Pre-compute and cache LM KV state for a fixed prompt, then reuse across multiple target generations
category: inference
version: 1.0.0
tags: [inference, kv-cache, tts, optimization, transformer]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/model/voxcpm2.py
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
---

# Cache LM KV for fixed prompt, reuse across multiple target generations

## When to use
Use this pattern when generating multiple speech outputs from the same reference speaker (same `prompt_text` + `prompt_audio`) but different target texts. Without caching, the LM re-encodes the prompt prefix for every generation — O(N·T_prompt) work that grows linearly with the number of targets. With prompt cache, that prefix is computed once.

Typical scenarios: batch cloning of many sentences from one reference, real-time TTS where the speaker stays constant across turns.

## Pattern

### Build the prompt cache once
```python
from dataclasses import dataclass
from typing import Any
import torch

@dataclass
class PromptCache:
    """Stores the pre-computed LM KV state for a reference prompt."""
    prompt_feat: torch.Tensor    # encoded prompt features  [B, T_prompt, D]
    kv_cache: list[tuple]        # per-layer (K, V) tensors
    prompt_len: int              # number of prompt tokens

def build_prompt_cache(
    model,
    prompt_text: str,
    prompt_audio: torch.Tensor,  # [B, 1, T_audio] at 16kHz
) -> PromptCache:
    """
    Encode the prompt once and return all intermediate states needed for generation.
    """
    with torch.no_grad():
        # Tokenize and encode text
        text_ids = model.tokenizer.encode(prompt_text)
        text_feat = model.text_encoder(torch.tensor(text_ids).unsqueeze(0))

        # Encode reference audio into latent patches
        audio_patches, _, _ = model.audio_vae.encode(prompt_audio)

        # Run LM forward on the prompt prefix, collect KV cache
        prompt_feat, kv_cache = model.lm.forward_prefix(
            text_feat=text_feat,
            audio_patches=audio_patches,
            return_kv_cache=True,
        )

    return PromptCache(
        prompt_feat=prompt_feat,
        kv_cache=kv_cache,
        prompt_len=text_feat.shape[1] + audio_patches.shape[1],
    )
```

### Reuse cache for each target
```python
def generate_with_prompt_cache(
    model,
    target_text: str,
    prompt_cache: PromptCache,
    cfg_value: float = 2.0,
    num_steps: int = 10,
) -> torch.Tensor:
    """
    Generate audio for target_text using the pre-computed prompt KV cache.
    Skips re-encoding the prompt prefix.
    """
    with torch.no_grad():
        target_ids = model.tokenizer.encode(target_text)
        target_feat = model.text_encoder(torch.tensor(target_ids).unsqueeze(0))

        # LM forward starting from prompt position, KV cache pre-filled
        audio_patches = model.lm.generate_with_cache(
            target_feat=target_feat,
            kv_cache=prompt_cache.kv_cache,      # pre-filled, no recompute
            prompt_feat=prompt_cache.prompt_feat,
            cfg_value=cfg_value,
        )

        # Diffusion decode
        audio = model.locdit.sample(audio_patches, num_steps=num_steps)
        return model.audio_vae.decode(audio)
```

### Batch usage pattern
```python
# Build cache once
cache = build_prompt_cache(model, prompt_text="Good evening.", prompt_audio=ref_wav)

# Generate many targets from the same speaker
target_sentences = [
    "The weather today is sunny.",
    "Please proceed to gate 42.",
    "Your flight has been delayed.",
]

outputs = []
for sentence in target_sentences:
    audio = generate_with_prompt_cache(model, sentence, cache)
    outputs.append(audio)
```

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/model/voxcpm2.py:1050+` — `build_prompt_cache` and `_generate_with_prompt_cache` implementation

## Notes
- The KV cache is device-bound — build and consume it on the same GPU. Do not move it between devices without calling `.to(device)` on all tensors in the cache list.
- Cache is not valid if you change `cfg_value` between prompt and generation — CFG requires consistent conditioning. Build the cache once at your target `cfg_value`.
- For a single target text, the overhead of `build_prompt_cache` may not be worth it; the break-even is typically 2–3 target sentences.
