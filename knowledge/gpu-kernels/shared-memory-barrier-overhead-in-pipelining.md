---
version: 0.1.0-draft
name: shared-memory-barrier-overhead-in-pipelining
summary: Pipeline barriers eat fixed smem — ~16B/stage on SM90 and ~24B/stage+40B on SM100. Ignoring them leads to overshooting the 232KB budget and picking illegal stage counts.
category: gpu-kernels
tags: [smem, barriers, pipeline, synchronization, sm90, sm100]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit_kernels/heuristics/sm90.hpp
  - csrc/jit_kernels/heuristics/sm100.hpp
imported_at: 2026-04-18T13:12:58Z
---

# Shared-Memory Barrier Overhead in Pipelining

## Summary
Every pipeline stage carries a fixed shared-memory overhead for its synchronization barriers:

- **SM90:** `kNumMaxStages × 8 × 2` bytes = **16 bytes/stage** (full + empty, 8B each).
- **SM100:** `kNumMaxStages × 8 × 3 + 2 × 8 × 2 + 8` = **24 bytes/stage + 40 bytes fixed** (three phases: TMA full/empty + SF barriers + utilization-control; plus a global control barrier).

With `kNumMaxStages` often at 10-16, this adds up to **240-400 bytes** of fixed smem on top of C/D tensor, SF storage, and per-stage A/B tiles. For small kernels, ignoring it means choosing `num_stages` that physically doesn't fit.

## Why it matters
- The 232 KB smem budget has to cover: barriers + C/D + SF + (A_stage + B_stage + SF_stage) × num_stages. Under-accounting barriers leaves the stage-count math off by ~5-10%, which flips borderline configs from "fits" to "overflow."
- SM100's 3-phase barriers are ~50% more expensive than SM90 — don't reuse SM90 staging constants on SM100.
- Extra SFB buffer on 1D2D kernels adds another fixed chunk — factor it in when computing `fixed_overhead`.

## Practical implications
- When porting a heuristic from one arch to another, recompute barrier overhead fresh. Arch-tuned magic constants don't transfer.
- `num_stages < 3` → drop the candidate (not enough to hide TMA latency). This threshold is set *after* the barrier math, not before.
- Build a named-constant table of (arch, barrier_bytes_per_stage, fixed_smem_overhead) so the arithmetic is auditable per revision.
