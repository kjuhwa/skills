---
version: 0.1.0-draft
name: swap-ab-for-m-grouped-on-sm100
description: On Blackwell (SM100), every M-grouped GEMM variant (contiguous, masked, contiguous-with-psum) unconditionally enables...
type: knowledge
category: arch
confidence: medium
source: DeepGEMM
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit_kernels/heuristics/sm100.hpp
tags: [swap-ab, sm100, blackwell, m-grouped, multicast, layout]
imported_at: 2026-04-18T13:30:00Z
---

# SM100 M-Grouped GEMMs Always Swap A/B — Multicast Only On cluster_n

## Fact / Decision
On Blackwell (SM100), every M-grouped GEMM variant (contiguous, masked, contiguous-with-psum) unconditionally enables swap-AB. The rationale is hardware-specific: the SM100 layout-A/D (output) register format is pinned at UMMA-M = 128, and the only cluster axis that can multicast the right-hand operand in this configuration is `cluster_n`. `cluster_m` multicast is incompatible with the swapped role of A in the output-layout pipeline.

This manifests as a layout-enumeration rule: after swapping, `cluster_m` must be 1 and `cluster_n` is whatever multicast width the shape supports (1 or 2).

## Why it matters
- **M-grouped GEMMs are the hot path for MoE training** (gradient of the expert weights). They must run at peak throughput.
- **Swap-AB** transposes the producer-consumer relationship between A and B tiles in the pipeline — the compiler emits different TMA descriptors, different MMA instruction shapes (`UMMA_N = 128` becomes the outer loop), different epilogue paths.
- **The enumeration code is explicit:**
  ```cpp
  if (desc.gemm_type == GemmType::MGroupedContiguous || ...) {
      const bool swap_ab = true;
      const auto block_n = 128;
      const auto block_m = heuristics_runtime->get_mk_alignment_for_contiguous_layout();
      const auto cluster_m = 1;
      const auto cluster_n = ceil_div(desc.n, block_n) % 2 == 0 && desc.num_sms % 2 == 0 ? 2 : 1;
      // ... one candidate, no enumeration
  }
  ```
  Just one candidate is returned — this is a pinned layout, not a search.

## Evidence
- `csrc/jit_kernels/heuristics/sm100.hpp:32-43`: the dedicated M-grouped branch that skips enumeration and pins `swap_ab = true, cluster_m = 1`.
- `csrc/jit_kernels/heuristics/sm100.hpp:77-88`: in the general enumeration, after swap_ab the comment block makes the same point for non-grouped: "After swapping, layout A/D can only do on cluster N" (line 77). That's the same constraint generalized.
- `csrc/jit_kernels/heuristics/sm100.hpp:119-121`: the layout-A/D M is hardcoded to 128:
  ```cpp
  constexpr int layout_ad_m = 128;
  if (swap_ab and block_n != layout_ad_m) continue;
  ```

## Caveats / When this doesn't apply
- **SM90 doesn't swap AB.** The Hopper heuristic asserts `layout.swap_ab == 0` in `get_storage_config`. The whole swap dance is SM100-specific.
- **Batched (non-grouped) GEMMs** on SM100 may or may not benefit from swap-AB — the full enumeration in `sm100.hpp` explores both.
- **If cluster_n=2 is illegal** (N isn't divisible by 2*block_n, or SM count isn't even), swap-AB still happens but multicast is off. You pay the swap cost without the multicast benefit.
- **Changing the mk alignment** via `set_mk_alignment_for_contiguous_layout` shifts `block_m` — this is the one user-visible knob for M-grouped tuning. Default 128, can go down to ~32 for small-M inference.
