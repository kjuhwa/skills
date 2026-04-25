---
name: smem-capacity-aware-pipeline-staging
description: Derive the number of pipeline stages from the remaining shared memory after fixed overheads, clamp to the arch max, and reject under-staged configs that cannot hide TMA latency.
category: kernel-heuristics
version: 1.0.0
version_origin: extracted
tags: [shared-memory, pipeline, smem-layout, gpu-optimization, latency-hiding]
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

# SMEM-Capacity-Aware Pipeline Staging

## What / Why
The number of pipeline stages is the single biggest lever for TMA-driven GEMMs: more stages → more in-flight loads → better latency hiding, until you run out of shared memory. Compute `num_stages` directly from `(smem_budget − fixed_overhead) / per_stage_size`, clamp to `kNumMaxStages`, and refuse any candidate below the minimum threshold required to hide TMA latency (≥3, or ≥4 for small matrices).

## Procedure
1. **Compute fixed overhead.**
   - C/D tensor storage (1024B-aligned) if kernel stores in smem.
   - Barrier array: `kNumMaxStages × 8 × 2` bytes on SM90, `kNumMaxStages × 8 × 3 + 40` bytes on SM100 (extra TMA full/empty + SF barriers + utilization control).
   - Scale-factor (SF) storage if block-scaled FP8.
   - Extra SFB buffer for 1D2D variants.
2. **Compute per-stage size.**
   - A stage: `load_block_m × block_k × elem_size_a`.
   - B stage: `load_block_n × block_k × elem_size_b`.
   - Plus per-stage SF if scaled.
3. **Derive stage count.**
   ```
   smem_budget = 232 * 1024   // SM90 / SM100
   available   = smem_budget - fixed_overhead
   num_stages  = min(available / per_stage_size, kNumMaxStages)
   ```
4. **Reject if too few stages.** `num_stages < 3` → drop the candidate. `num_stages < 4` → drop for small-m matrices where TMA latency dominates.
5. **Prefer fewer big stages over many small stages** when scoring — larger per-stage loads amortize descriptor setup and improve TMA efficiency.

## Key design points
- SM100 has ~3× the per-stage barrier cost as SM90 (three phases vs two). Don't copy SM90's constants blindly.
- The smem budget is not 228/256 — it's 232 KB on both current archs for user programs after CUDA runtime reservations.
- Always set `kNumMaxStages` as a compile-time constant so the kernel can allocate a fixed-size barrier array.

## References
- `csrc/jit_kernels/heuristics/sm90.hpp` — `get_smem_capacity` and staging block (~line 156).
- `csrc/jit_kernels/heuristics/sm100.hpp` — staging block (~line 187) with larger barrier cost.
