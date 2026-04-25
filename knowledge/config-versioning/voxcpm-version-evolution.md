---
version: 0.1.0-draft
name: voxcpm-version-evolution
summary: VoxCPM evolved from 0.5B (2-language) → 1.5 (multilingual) → 2 (2B, 30 languages, voice design, 48kHz); versions are not backward-compatible
category: config-versioning
tags: [versioning, voxcpm, architecture, compatibility, changelog]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - README.md
  - conf/voxcpm_v1.5/
  - conf/voxcpm_v2/
imported_at: 2026-04-18T00:00:00Z
---

# VoxCPM 0.5B → 1.5 → 2 capability evolution

VoxCPM has gone through three major releases with significant capability and architecture differences between them. VoxCPM 0.5B was the initial release: a 500M parameter model supporting Chinese and English only, with continuation-mode synthesis (no explicit voice design, no controllable cloning). VoxCPM 1.5 expanded to multilingual support and introduced ultimate cloning mode (requires reference transcript). VoxCPM 2 is the current flagship: 2B parameters, approximately 30 language support, 48kHz output via the asymmetric AudioVAE V2, and both voice design mode (parenthesized natural-language control) and controllable cloning.

The versions are **not backward-compatible**. Config schemas differ (`LoRAConfigV1` vs `LoRAConfigV2`), model checkpoint formats differ (safetensors vs .pth availability), and the feature set differs substantially. Code that loads VoxCPM models must detect the architecture from `config.json` and dispatch accordingly rather than assuming a single format.

The `conf/voxcpm_v1.5/` and `conf/voxcpm_v2/` directories in the repository contain version-specific default configurations; do not mix configs across versions.

## Why it matters
When maintaining a codebase that supports multiple VoxCPM checkpoints (e.g., a deployment with both V1.5 for legacy users and V2 for new users), the architecture dispatch pattern is mandatory. Running V2 inference code against a V1.5 checkpoint, or loading V1 LoRA configs for a V2 model, will produce either a crash or silently degraded output.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `README.md` — version history and capability matrix
  - `conf/voxcpm_v1.5/` — V1.5 default config files
  - `conf/voxcpm_v2/` — V2 default config files
