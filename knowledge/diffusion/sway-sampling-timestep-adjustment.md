---
version: 0.1.0-draft
name: sway-sampling-timestep-adjustment
summary: Sway sampling adjusts the ODE timestep trajectory via a cosine perturbation; coef=1.0 is neutral, tuning 0.8–1.2 affects quality
category: diffusion
tags: [diffusion, sampling, ode, timestep, flow-matching]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/modules/locdit/unified_cfm.py
imported_at: 2026-04-18T00:00:00Z
---

# Sway sampling cosine-based timestep trajectory adjustment

VoxCPM's LocDiT diffusion sampler optionally applies a cosine-based perturbation to the ODE timestep schedule before each network evaluation. The formula is: `t_adj = t + coef * (cos(π/2 · t) - 1 + t)`. At `coef=1.0` the perturbation evaluates to zero (the cosine and linear terms cancel), making it a neutral passthrough. Values below 1.0 shift timesteps earlier in the denoising trajectory (more time spent near noise), while values above 1.0 shift them later (more time spent near data).

This is an underdocumented feature in VoxCPM — it is not exposed as a CLI flag in the main interface but is present in `unified_cfm.py` as `sway_sampling_coef`. The practical tuning range is approximately 0.8–1.2. Small deviations from 1.0 can meaningfully improve output quality for specific voice types or input lengths, but effects are difficult to predict without empirical testing.

## Why it matters
If you're building custom inference code on top of VoxCPM's LocDiT module and experimenting with sample quality, `sway_sampling_coef` is a free quality knob that costs nothing at inference time (it's just a scalar arithmetic operation on the timestep). Set it to 1.0 to disable; experiment with ±0.1 increments to find your optimum.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/modules/locdit/unified_cfm.py:66-68` — the sway sampling formula applied to `t_span` before network evaluation
