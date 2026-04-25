---
version: 0.1.0-draft
name: tokenizer-free-continuous-latent-rationale
summary: VoxCPM avoids discrete audio codebooks by operating on continuous AudioVAE latents throughout, preserving fidelity
category: model-architecture
tags: [architecture, tokenizer, latent, vae, audio]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - README.md
  - src/voxcpm/training/packers.py
imported_at: 2026-04-18T00:00:00Z
---

# Tokenizer-free design: continuous AudioVAE latents over discrete codes

VoxCPM makes a deliberate architectural choice to avoid discretizing audio into codebook tokens (as used by EnCodec, SoundStream, or VALL-E). Instead, the AudioVAE encodes raw waveforms into a sequence of continuous latent patches, and all downstream model stages (TSLM, RALM, LocDiT) operate on these real-valued tensors. The diffusion model (LocDiT) generates directly in this continuous latent space, and the AudioVAE decoder reconstructs the waveform from the generated latents.

Avoiding quantization eliminates the reconstruction error introduced by rounding to the nearest codebook entry — an error floor that is audible at high sampling rates (48kHz) and on fine phonetic details like sibilants and fricatives. Continuous latents also allow the diffusion model to express uncertainty as a distribution over the latent space rather than a probability over a fixed vocabulary, which translates to smoother, higher-fidelity outputs.

The trade-off is that the model cannot use a standard language-model next-token prediction loss on audio; instead it uses a flow-matching regression loss on the latent patches, which requires the LocDiT diffusion step at inference time.

## Why it matters
This design decision explains why you cannot fine-tune VoxCPM with standard LM training objectives (cross-entropy on discrete tokens). Any fine-tuning pipeline must account for the flow-matching loss on continuous audio patches and the separate masking strategy for text vs. reference vs. target audio regions.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `README.md` — motivation section explaining the tokenizer-free approach
  - `src/voxcpm/training/packers.py:51-68` — packer that handles continuous patch interleaving with text token IDs
