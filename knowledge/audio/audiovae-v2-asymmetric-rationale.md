---
name: audiovae-v2-asymmetric-rationale
summary: AudioVAE V2 encodes at 16kHz for compute efficiency but decodes to 48kHz via learned upsampling, eliminating external resamplers
category: audio
tags: [audiovae, super-resolution, architecture, 48khz, codec]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/modules/audiovae/audio_vae_v2.py
  - README.md
imported_at: 2026-04-18T00:00:00Z
---

# Why AudioVAE V2 encodes at 16kHz but decodes at 48kHz

AudioVAE V2 deliberately uses an asymmetric sample-rate design: the encoder accepts 16kHz waveforms, while the decoder produces 48kHz output. The 16kHz encoding rate is cheaper to process (smaller convolution windows, shorter sequences) and matches the typical input quality of telephone or ASR recordings, reducing the barrier for reference audio quality. The 3× upsampling to 48kHz happens inside the decoder via learned ConvTranspose1d layers, which the model trains to reconstruct high-frequency content from the latent representation.

This design eliminates the need for an external audio super-resolution or resampling module at inference time. The alternative — encoding at 48kHz — would triple the compute cost of the encoder and require high-quality 48kHz reference audio from users, which is often unavailable. The alternative of encoding at 16kHz then upsampling with a fixed-coefficient filter (e.g., librosa or torchaudio) would not learn to reconstruct missing high-frequency harmonics, producing muffled output.

## Why it matters
When integrating VoxCPM into a pipeline, you should pass 16kHz reference audio to the encoder — do not pre-upsample it to 48kHz before encoding, as that wastes compute without improving quality. The output of `vae.decode()` will always be 48kHz regardless of input sample rate.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/modules/audiovae/audio_vae_v2.py` — encoder/decoder architecture showing the asymmetric stride configuration
  - `README.md` — technical notes on AudioVAE V2 design rationale
