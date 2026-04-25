---
version: 0.1.0-draft
name: tensor-map-swizzle-vs-shared-memory-banking
summary: Shared memory is 32 banks x 4 bytes. TMA swizzle reshuffles 128B chunks so sequential warps hit different banks, encoded in the descriptor — no device-side logic needed.
category: gpu-kernels
tags: [tma, swizzle, shared-memory, banks, bank-conflicts, memory-subsystem]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit_kernels/impls/runtime_utils.hpp
imported_at: 2026-04-18T13:12:58Z
---

# Tensor Map Swizzle vs Shared Memory Banking

## Summary
CUDA shared memory on SM90/SM100 has **32 banks × 4 bytes per bank = 128 bytes per row**. Sequential 4-byte elements map to consecutive banks (`0, 1, …, 31, 0, 1, …`). Without intervention, a warp accessing a strided matrix hits the same bank repeatedly → serialized access.

TMA swizzling fixes this by reshuffling data *at load time*: 128B chunks are permuted so strided accesses land on different banks. The swizzle pattern is encoded in the descriptor (`CU_TENSOR_MAP_SWIZZLE_128B`), and the TMA hardware applies it during the `cp.async.bulk.tensor` operation — the kernel uses normal indices.

## Why it matters
- 128B swizzle = zero bank conflicts for most GEMM access patterns. 64B swizzle = acceptable. 32B / NONE = typically catastrophic.
- The swizzle pattern interacts with the smem inner dim: after swizzle, effective inner dim = `swizzle_mode / elem_size`, not the original. Size your smem allocation accordingly.
- This is one of the few GPU memory optimizations that's **free at kernel level** — no loop unrolling, no hand-tuned strides, just pick the right enum when building the descriptor.

## Practical implications
- Always set swizzle when building `CUtensorMap`. Never use `CU_TENSOR_MAP_SWIZZLE_NONE` unless you've measured it's faster for your specific shape (rare).
- For FP4 / packed data, swizzle interacts with unpacking — use DeepGEMM's `mode_into_tensor_map_swizzle()` helper which knows about packed formats.
- When debugging smem access perf, dump the descriptor's swizzle mode first; a wrong swizzle is a common root cause for unexplained slow kernels.
