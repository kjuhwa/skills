---
version: 0.1.0-draft
name: cfg-and-timesteps-tradeoffs
summary: VoxCPM CFG defaults to 2.0 (range 1–3) and inference steps to 10 (range 4–30); RTF scales inversely with steps
category: inference
tags: [cfg, timesteps, inference, quality, latency]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/cli.py
  - app.py
imported_at: 2026-04-18T00:00:00Z
---

# CFG value and inference timestep knobs

VoxCPM exposes two key inference quality knobs: `cfg_value` (classifier-free guidance scale) and `num_steps` (diffusion inference timesteps). Their defaults — `cfg_value=2.0`, `num_steps=10` — represent a practical balance between speed and quality validated by the VoxCPM team.

The `cfg_value` range is approximately 1.0–3.0. At `cfg_value=1.0` guidance is disabled (unconditional generation); values below 1.5 produce under-constrained, sometimes incoherent speech. Values above 3.0 produce robotic, over-processed output with clipping artifacts. The sweet spot for natural-sounding synthesis is 1.8–2.5.

The `num_steps` range is 4–30. Fewer steps (4–6) produce faster but rougher audio; more steps (20–30) improve quality at the cost of proportionally higher latency. Real-time factor (RTF) is approximately inversely proportional to `num_steps` — halving the steps roughly doubles the throughput. The default of 10 steps achieves near-peak quality in testing while remaining well above real-time on a single A100 GPU.

## Why it matters
These two knobs interact: raising `cfg_value` without raising `num_steps` can introduce artifacts because the guidance signal pushes the trajectory strongly in a direction that low-step ODE integration doesn't resolve cleanly. For production deployments, tune both together: start at (cfg=2.0, steps=10), then experiment upward.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/cli.py:48-52` — `--cfg-value` and `--num-steps` argument definitions with defaults
  - `app.py:113-116` — Gradio slider definitions with min/max/default values
