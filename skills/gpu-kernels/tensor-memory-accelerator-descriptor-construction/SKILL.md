---
name: tensor-memory-accelerator-descriptor-construction
description: Build Hopper/Blackwell TMA descriptors at host time via cuTensorMapEncodeTiled so kernels can issue async tiled loads without per-address arithmetic.
category: gpu-kernels
version: 1.0.0
version_origin: extracted
tags: [tma, hopper, blackwell, cuda-driver-api, memory-subsystem, swizzle]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit_kernels/impls/runtime_utils.hpp
  - csrc/apis/layout.hpp
imported_at: 2026-04-18T13:12:58Z
---

# Tensor Memory Accelerator Descriptor Construction

## What / Why
On Hopper (SM90) and Blackwell (SM100), TMA is a dedicated engine for asynchronous tiled copies between global and shared memory. Descriptors (`CUtensorMap`) are built **on the host** via `cuTensorMapEncodeTiled()` and passed to kernels. The kernel only issues a load/store with a descriptor + tile coords — no per-thread address math, no manual swizzle handling in device code.

## Procedure
1. **Gather tensor metadata** from the PyTorch tensor or raw pointer: base ptr, global dims, strides (in elements), element size.
2. **Choose a swizzle mode** based on the shared-memory block's inner dimension:
   - Target 128B swizzle (best L2 hit rate + no bank conflicts).
   - Fall back to 64B if 128B doesn't fit; refuse 32B (≈50% perf cliff).
   - Formula: `swizzle_mode = lcm(16, block_inner_dim × elem_size)` clamped to `{32, 64, 128}`.
3. **Apply format-specific alignment.** For FP4 / packed 4-bit, the smem unpacking factor and 64B alignment rules apply — consult `mode_into_tensor_map_swizzle()` helper.
4. **Call `cuTensorMapEncodeTiled()`** with:
   - Interleave: NONE unless you know you need COL_INTERLEAVE.
   - SMEM dims (per-tile) and GMEM dims (full tensor).
   - Strides: must be monotonically increasing innermost→outermost.
   - L2 promotion: `CU_TENSOR_MAP_L2_PROMOTION_L2_128B` for most workloads.
5. **Pass the descriptor to the kernel** as a kernel param (via launch args) or copy into a constant buffer.
6. **Kernel uses `cp.async.bulk.tensor`** PTX (or the abstraction in CUTLASS/CUTE) with tile coords — the hardware applies swizzle and stride math automatically.

## Key design points
- Descriptor encodes swizzle — no device-side reshape code needed.
- Host-side construction is cheap but not free; cache descriptors per (ptr, shape) tuple if reused.
- Lazy-load `cuTensorMapEncodeTiled` via `dlsym` so your library works against older CUDA installs that lack the symbol.

## References
- `csrc/jit_kernels/impls/runtime_utils.hpp` — `get_swizzle_mode()`, `mode_into_tensor_map_swizzle()`, descriptor builders.
- `csrc/apis/layout.hpp` — tensor-to-descriptor glue at the public API boundary.
