---
version: 0.1.0-draft
name: streaming-prefix-len-window
summary: streaming_prefix_len (default 4) controls the overlap window used to avoid boundary artifacts in streaming TTS chunk output
category: streaming
tags: [streaming, tts, audio, latency, chunking]
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
---

# streaming_prefix_len windowing strategy

When VoxCPM generates audio in streaming mode, it yields audio chunks before the full sequence is complete. A naive implementation that decodes each new audio patch independently would produce audible glitches at chunk boundaries, because the AudioVAE decoder has convolutional layers with receptive fields that span multiple patches. The `streaming_prefix_len` parameter solves this by keeping the last N patches in context during each decode call.

The default value is 4, meaning each decode call processes the 4 most recent patches but yields only the audio corresponding to the newest patch (the tail). The previous 3 patches serve as context to ensure the decoder's convolutional layers have enough history to produce clean output at the boundary. Increasing `streaming_prefix_len` reduces boundary artifacts at the cost of higher per-chunk latency; decreasing it reduces latency but increases the risk of audible discontinuities.

Setting `streaming_prefix_len=1` degenerates to non-overlapping decoding and will produce noticeable artifacts at patch boundaries on most hardware. The overlap strategy eliminates glitches without requiring a separate cross-fade or blending step in the caller.

## Why it matters
If you are building a real-time TTS application on top of VoxCPM and observe clicking or discontinuity artifacts between audio chunks, increasing `streaming_prefix_len` from 4 to 6 or 8 is the first thing to try. Conversely, if end-to-end latency (time to first audio) is too high, reducing it to 3 (with careful testing) may help.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/model/voxcpm2.py` — streaming generator with `streaming_prefix_len` sliding window
  - `src/voxcpm/model/voxcpm.py` — V1 equivalent implementation
