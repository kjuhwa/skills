---
version: 0.1.0-draft
name: tma-swizzling-mode-selection-by-byte-alignment
summary: TMA swizzle mode is chosen as lcm(16, inner_dim × elem_size) clamped to {32,64,128}B — 32B swizzle triggers a ~50% perf cliff, so treat 64B as the floor.
category: gpu-kernels
tags: [tma, swizzle, shared-memory, bank-conflicts, hopper, gpu-optimization]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit_kernels/heuristics/sm90.hpp
  - csrc/jit_kernels/impls/runtime_utils.hpp
imported_at: 2026-04-18T13:12:58Z
---

# TMA Swizzling Mode Selection by Byte Alignment

## Summary
Each TMA descriptor picks one of four swizzle modes: **16B / 32B / 64B / 128B**. The chosen mode determines how 128-byte rows are shuffled in shared memory to avoid bank conflicts when warps access tiles.

**Formula** (`get_swizzle_mode()`):
```
swizzle_mode = lcm(16, inner_dim × elem_size)   // clamped to {32, 64, 128}
```

Example: `block_k = 64 elements × 2 bytes (FP8) = 128 bytes` → swizzle = 128B (ideal).

## Why it matters
- **128B swizzle** is the target — fills all 32 banks × 4 bytes perfectly, no conflicts.
- **64B swizzle** is acceptable — half a row per shuffle, still conflict-free.
- **32B swizzle** causes ~50% perf regression — only 8 banks per shuffle, leaving half the banks idle. DeepGEMM's heuristic explicitly rejects candidates where `swizzle_a_mode % 64 != 0 || swizzle_b_mode % 64 != 0`.
- **16B swizzle** is functionally broken for GEMM — don't use.

## Practical implications
- When enumerating GEMM configs, filter on `swizzle >= 64`. This eliminates huge swaths of the search space cheaply.
- For the C/D output tensor, compute swizzle from `store_block_n` (not the full block). FP32 output sometimes uses no swizzle at all — the epilogue pattern accesses it strided anyway.
- When your inner-dim × elem-size is < 64B (e.g., small block_n with FP8), either increase block_n or accept the perf cliff.
- `smem_inner_dim` after swizzle is `swizzle_mode / elem_size`, not the original `inner_dim` — account for this in smem-size calculations.
