---
version: 0.1.0-draft
name: voxcpm2-four-stage-pipeline
summary: VoxCPM2 generates speech via a four-stage pipeline: LocEnc → TSLM → RALM → LocDiT diffusion
category: model-architecture
tags: [voxcpm, architecture, tts, diffusion, pipeline]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/model/voxcpm2.py
  - README.md
imported_at: 2026-04-18T00:00:00Z
---

# LocEnc → TSLM → RALM → LocDiT diffusion pipeline

VoxCPM2 decomposes speech synthesis into four sequential stages, each with a distinct role. First, **LocEnc** (Local Encoder) encodes the reference audio into a compact speaker-localized representation, capturing timbre and prosody without the full sequence length of raw audio. Second, **TSLM** (Text-Speaker Language Model) fuses the encoded speaker representation with the input text tokens, generating a high-level conditioning signal that reflects both linguistic content and target voice characteristics. Third, **RALM** (Reference Audio Language Model) processes the audio history — the sequence of previously generated audio patches — to provide autoregressive context that ensures continuity across patches. Fourth, **LocDiT** (Local Diffusion Transformer) takes the TSLM/RALM conditioning and generates new audio patches via flow-matching diffusion, producing the final waveform latents that are decoded by AudioVAE.

The design is tokenizer-free: all audio is represented as continuous AudioVAE latent patches, never as discrete codebook indices. This means each stage operates on real-valued tensors throughout, and the diffusion step runs in latent space rather than token space.

## Why it matters
Understanding the four stages is essential for debugging inference failures — each stage has distinct failure modes (LocEnc dropout causes voice leak, TSLM miscondition causes wrong style, RALM discontinuity causes boundary artifacts, LocDiT steps-too-few causes noisy output). It also determines where to apply LoRA during fine-tuning.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/model/voxcpm2.py:147-250` — class definitions and `forward()` routing across all four stages
  - `README.md` — architecture overview diagram
