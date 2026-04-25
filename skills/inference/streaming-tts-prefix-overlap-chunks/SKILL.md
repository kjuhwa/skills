---
name: streaming-tts-prefix-overlap-chunks
description: Streaming TTS via overlapping audio chunks windowed by streaming_prefix_len to avoid boundary artifacts
category: inference
version: 1.0.0
tags: [streaming, tts, audio, generator, inference]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/model/voxcpm2.py
  - src/voxcpm/model/voxcpm.py
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
---

# Streaming TTS via overlapping audio chunks windowed by streaming_prefix_len

## When to use
Use this pattern when generating speech token-by-token (or patch-by-patch) and you need to yield playable audio segments to the caller before generation is complete. A naive "yield each new chunk" approach produces audible glitches at boundaries because the decoder's convolutional layers need context from the previous segment. The overlap window eliminates those glitches without a separate blending step.

## Pattern

### Core idea
Keep the last `streaming_prefix_len` patches in the context buffer. On each iteration, decode the full buffer but yield only the **tail** — the audio that corresponds to the new patches beyond the overlap window.

```
Buffer: [P0 P1 P2 P3 | P4 P5]   (streaming_prefix_len=4, 2 new patches)
Decode: full buffer → audio[0..N]
Yield:  audio[patch_len * (streaming_prefix_len - 1) : ]   ← tail only
```

### Implementation sketch

```python
from typing import Generator
import torch

def stream_generate(
    model,
    text_tokens: torch.Tensor,
    streaming_prefix_len: int = 4,
) -> Generator[torch.Tensor, None, None]:
    """
    Yields decoded audio chunks as they are generated.
    Each chunk is the new audio since the previous yield.
    """
    patch_buffer = []   # list of latent patches accumulated so far

    for new_patch in model.generate_patches(text_tokens):
        patch_buffer.append(new_patch)

        # Only start yielding once we have enough context
        if len(patch_buffer) < streaming_prefix_len:
            continue

        # Keep only the last streaming_prefix_len patches in the sliding window
        context = patch_buffer[-streaming_prefix_len:]

        # Decode the full context window
        audio = model.decode_audio(torch.stack(context, dim=1))  # [B, T]

        patch_len = audio.shape[-1] // streaming_prefix_len

        # Yield only the tail — the new audio, not the overlap prefix
        tail_start = patch_len * (streaming_prefix_len - 1)
        yield audio[..., tail_start:]

    # Flush remaining patches (< streaming_prefix_len at end)
    if patch_buffer:
        remaining = patch_buffer[-(streaming_prefix_len):]
        audio = model.decode_audio(torch.stack(remaining, dim=1))
        patch_len = audio.shape[-1] // len(remaining)
        tail_start = patch_len * (len(remaining) - 1)
        yield audio[..., tail_start:]
```

### Caller usage
```python
import soundfile as sf

chunks = []
for chunk in stream_generate(model, tokens, streaming_prefix_len=4):
    chunks.append(chunk.cpu().numpy())
    # In a real app: push chunk to audio output buffer / websocket

audio_full = np.concatenate(chunks, axis=-1)
sf.write("output.wav", audio_full.T, samplerate=48000)
```

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/model/voxcpm2.py:920-1000` — streaming generator with tail-slice logic
  - `src/voxcpm/model/voxcpm.py` — V1 equivalent streaming implementation

## Notes
- Default `streaming_prefix_len=4` is a good starting point; increase for fewer boundary artifacts at the cost of higher latency per chunk.
- The overlap window size (`streaming_prefix_len - 1` patches) must be > 0; setting `streaming_prefix_len=1` degenerates to non-overlapping chunks with potential artifacts.
- The tail-slice calculation assumes uniform patch duration. If patch sizes vary, compute byte offsets from the patch metadata rather than dividing evenly.
