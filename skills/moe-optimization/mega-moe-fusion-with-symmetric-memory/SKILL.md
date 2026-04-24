---
name: mega-moe-fusion-with-symmetric-memory
description: Fuse EP dispatch, FP8×FP4 GEMM×2, SwiGLU, and EP combine into a single kernel that reads across ranks via symmetric-memory (same VA on every rank) to overlap NVLink collectives with compute.
category: moe-optimization
version: 1.0.0
version_origin: extracted
tags: [moe, kernel-fusion, symmetric-memory, nvlink, communication-compute-overlap]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit_kernels/heuristics/mega_moe.hpp
  - deep_gemm/mega/__init__.py
  - tests/test_mega_moe.py
imported_at: 2026-04-18T13:12:58Z
---

# Mega MoE Fusion With Symmetric Memory

## What / Why
A classic EP (expert-parallel) MoE step is five discrete ops: allgather tokens, gather-by-expert, GEMM1, SwiGLU, GEMM2, scatter-combine. Each has its own launch + barrier + memory pass. Mega MoE fuses all of them into **one** kernel that reads from *peer-rank* buffers using symmetric memory (same virtual address on every rank, backed by CUDA IPC). Compute on local experts overlaps with NVLink traffic to/from peers — no explicit allgather + compute phase boundaries.

## Procedure
1. **Require PyTorch ≥ 2.9** for the `torch.cuda.symmetric_memory` API (same VA across ranks via IPC).
2. **Allocate a symmetric buffer.** `get_symm_buffer_for_mega_moe(group, num_experts, num_max_tokens_per_rank, num_topk, hidden, intermediate_hidden)` returns one `MegaMoEBuffer` per rank, all sharing virtual addresses.
3. **Layout the buffer** with named regions: `x` (activations FP8), `x_sf` (UE8M0 scales), `topk_idx`, `topk_weights`, `weights` (FP4, read-only), `output`.
4. **Select kernel config** via `mega_moe.hpp` heuristic: picks `block_m` (tokens per expert), `block_n` (hidden per expert), `block_k`; accounts for a 2× imbalance factor when estimating per-expert token count.
5. **Kernel pipeline stages.**
   - Phase 1: warp-group 0 issues cross-rank TMA loads of peer-rank `x` into smem.
   - Phase 2: warp-groups 1-N run GEMM1 (FP8 × FP4) on already-arrived tiles.
   - Phase 3: fused SwiGLU (gate × silu(up)).
   - Phase 4: GEMM2.
   - Phase 5: cross-rank TMA stores into peer-rank `output` — the EP combine.
6. **Barrier layout.** Dependency tracking via lightweight mbarriers; no `__syncthreads()` across the whole block.

## Key design points
- Symmetric memory is the critical enabler — without it, you need host-side gather, which serializes the pipeline.
- The imbalance factor (2×) is empirical for typical top-k routing. Heavily skewed models should override `mk_alignment_for_contiguous_layout()`.
- Keep FP8 activations and FP4 weights — no mid-kernel dequantization to FP32. Accumulator stays BF16 / FP32 per tensor-core protocol.

## References
- `csrc/jit_kernels/heuristics/mega_moe.hpp` — config search with imbalance factor.
- `deep_gemm/mega/__init__.py` — Python API + symmetric buffer helper.
- `tests/test_mega_moe.py` — reference correctness check against DeepEP baseline.
