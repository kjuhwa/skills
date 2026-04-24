---
name: multi-kernel-dispatch-with-shape-driven-selection
description: Hide multiple kernel variants (1D1D vs 1D2D, SM90 vs SM100, packed-vs-unpacked SF) behind a single public API by inspecting tensor metadata to pick the right dispatcher.
category: gpu-kernels
version: 1.0.0
version_origin: extracted
tags: [kernel-dispatch, shape-analysis, polymorphism, api-design]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/apis/gemm.hpp
imported_at: 2026-04-18T13:12:58Z
---

# Multi-Kernel Dispatch With Shape-Driven Selection

## What / Why
Users want one function (`fp8_gemm_nt`) that "just works" regardless of scale granularity, architecture, or packing. Internally there are several kernels optimized for different shape classes. Read the transformed scale factors' metadata (dtype, granularity) to decide which kernel receives the call — the user never picks.

## Procedure
1. **Normalize inputs.** Transform user-supplied scales into the required layout (`transform_sf_pair_into_required_layout()`). This step also records `gran_n` and dtype as a side effect.
2. **Branch by arch.** Detect compute capability (SM90 vs SM100) once at init.
3. **Branch by scale metadata on SM90.**
   - `sfa/sfb` are FP32 and `gran_n == 1` → dispatch `sm90_fp8_gemm_1d1d_dispatch(...)`.
   - `sfa/sfb` are FP32 and `gran_n > 1` → dispatch `sm90_fp8_gemm_1d2d_dispatch(...)`.
4. **Branch by packing on SM100.**
   - `sfa/sfb` are packed UE8M0 `int32` → `sm100_fp8_fp4_gemm_1d1d_dispatch(...)`.
   - FP32 scales get auto-packed first, then the same dispatcher runs.
5. **Precondition check inside each dispatcher.** E.g., 1D1D rejects TMA-split scenarios; bounce back to 1D2D if needed.

## Key design points
- Keep the dispatch table explicit — a flat `if/else if` chain is easier to audit than a registry of function pointers for a small, fixed number of kernels.
- Do the transform *before* the dispatch. That way the dispatch sees the kernel-ready form and the dispatch logic is metadata-driven.
- Assert clearly when no kernel applies: include the shape, dtype, and granularity in the error.

## References
- `csrc/apis/gemm.hpp` — public `fp8_gemm_nt` with inline dispatch ladder.
- `csrc/jit_kernels/impls/*` — individual kernel dispatchers.
