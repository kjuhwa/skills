---
version: 0.1.0-draft
name: packed-fp4-as-int8-aliasing
description: DeepGEMM stores FP4 (4-bit float, E2M1 format) tensors under `torch.int8` because:
type: knowledge
category: domain
confidence: high
source: DeepGEMM
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/utils/math.hpp
  - csrc/utils/layout.hpp
  - csrc/jit_kernels/impls/runtime_utils.hpp
tags: [fp4, packed, int8, torch-dtype, type-aliasing]
imported_at: 2026-04-18T13:30:00Z
---

# Packed FP4 Is Represented As `torch.int8` (Until `Float4_e2m1fn_x2` Lands)

## Fact / Decision
DeepGEMM stores FP4 (4-bit float, E2M1 format) tensors under `torch.int8` because:
- PyTorch's `torch.kFloat4_e2m1fn_x2` dtype existed but wasn't stable at the time of development.
- Two FP4 values fit in one byte, so an "N FP4 values" tensor is the same memory layout as an "N/2 int8" tensor.
- Every `torch.int8` tensor carrying actual FP4 data is conventionally paired with scaling-factor tensors that disambiguate.

The code uses a single alias:
```cpp
constexpr auto kPackedFP4 = torch::kInt8;
```
and checks `ab.scalar_type() == kPackedFP4` to detect FP4, with a shape convention: if the inner dim of an FP4 tensor claims length `k`, the actual FP4 element count is `2k` (since two per byte).

## Why it matters
- **Shape arithmetic must account for packing.** When deciding TMA swizzle, check `kPackedFP4`:
  ```cpp
  if (ab.scalar_type() != torch::kFloat8_e4m3fn) {
      DG_HOST_ASSERT(ab.scalar_type() == kPackedFP4 and arch_major == 10);
      major == cute::UMMA::Major::K ? (k *= 2) : (mn *= 2);
  }
  ```
- **Element size is 1 byte** for FP4 in this representation — but the "real" tensor has `2 * numel` FP4 elements. This means:
  - `c10::elementSize(torch::kInt8) == 1` — correct for the memory.
  - A "64-element block" of FP4 is actually 32 bytes — half of what FP8 would need.
- **TMA descriptors get a special code path.** CUDA 12.8 introduced `CU_TENSOR_MAP_DATA_TYPE_16U4_ALIGN8B` and `..._ALIGN16B` for direct FP4 TMA loads. Before 12.8, you must stage into smem as 8-bit "unpacked" and convert.

## Evidence
- `csrc/utils/math.hpp:10-11`:
  ```cpp
  // TODO: use `torch::kFloat4_e2m1fn_x2`
  constexpr auto kPackedFP4 = torch::kInt8;
  ```
  The TODO makes the intent clear — this is a placeholder until the real dtype stabilizes.
- `csrc/utils/layout.hpp:45-61`: `check_ab_fp8_fp4` is the canonical "interpret the int8 tensor as FP4" helper — doubles `k` or `mn` depending on major-ness.
- `csrc/jit_kernels/impls/runtime_utils.hpp:85-91`: the TMA dtype mapping special-cases `kPackedFP4` with a CUDA-version guard.

## Caveats / When this doesn't apply
- **Switching to the native FP4 dtype** will require touching every `scalar_type() == kPackedFP4` site. Centralizing into the alias means one find-replace.
- **TMA alignment for FP4** is stricter — gmem inner dim must be a multiple of 128 (see the `fp4_unpacked_smem ... gmem_inner_dim % 128 == 0` assertion).
- **Don't serialize FP4 tensors to disk as int8 silently** — downstream readers need to know the true element count. Store metadata alongside.
- **SM90 (Hopper) has no FP4 path** in DeepGEMM. The `arch_major == 10` assertion enforces it.
