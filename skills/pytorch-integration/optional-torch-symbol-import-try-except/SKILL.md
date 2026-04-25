---
name: optional-torch-symbol-import-try-except
description: Wrap `from ._C import symbol_a, symbol_b` in `try/except ImportError` so your package still loads when the CUDA runtime/toolkit version is too old for TensorMap-using kernels — degraded functionality, not a hard crash.
category: pytorch-integration
version: 1.0.0
version_origin: extracted
tags: [python-packaging, import-time, cuda-compatibility, graceful-degradation, pybind11]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - deep_gemm/__init__.py
  - deep_gemm/utils/layout.py
  - csrc/utils/compatibility.hpp
imported_at: 2026-04-18T13:30:00Z
---

# Optionally Import Version-Gated C++ Symbols

## When to use
Your pybind11 extension exports dozens of symbols, some of which require a minimum CUDA runtime version (e.g. `cuTensorMapEncodeTiled` needs CUDA 12.1+). The C++ side uses `#if CUDA_VERSION >= 12010` to conditionally compile them. The Python side needs to match: if a user installs the wheel on a CUDA 11.8 system, the module still loads, but tensor-map kernels are absent. The CPU-only cuBLASLt path should still work.

Solution: group the conditional symbols into a single `try: from ._C import ...` block. Anything outside the block is always available.

## Steps
1. **On the C++ side, gate the entire kernel family with a macro:**
   ```cpp
   // csrc/utils/compatibility.hpp
   #define DG_TENSORMAP_COMPATIBLE (CUDA_VERSION >= 12010)
   ```
   Then in the API headers:
   ```cpp
   #if DG_FP8_COMPATIBLE and DG_TENSORMAP_COMPATIBLE
   #include "../jit_kernels/impls/sm90_fp8_gemm_1d1d.hpp"
   // ... all the other impls
   #endif
   ```
   At `register_apis()` time, these symbols simply don't bind when the macros are off.
2. **On the Python side, import unconditionally-available symbols first:**
   ```python
   from ._C import (
       set_num_sms, get_num_sms,
       set_tc_util, get_tc_util,
       # ... flags that exist in all builds
       # cuBLASLt wrappers — always compiled
       cublaslt_gemm_nt, cublaslt_gemm_nn,
       cublaslt_gemm_tn, cublaslt_gemm_tt,
   )
   ```
3. **Then import the gated symbols inside `try: / except ImportError:`:**
   ```python
   try:
       from ._C import (
           fp8_gemm_nt, fp8_gemm_nn,
           m_grouped_fp8_gemm_nt_contiguous,
           # ... TMA-using kernels
           transform_sf_into_required_layout,
       )
       # Legacy aliases only defined when the real function exists
       fp8_m_grouped_gemm_nt_masked = m_grouped_fp8_gemm_nt_masked
   except ImportError:
       # Expected behavior for CUDA runtime version before 12.1
       pass
   ```
4. **Repeat the pattern in submodules** that re-export the same gated symbols:
   ```python
   # deep_gemm/utils/layout.py
   try:
       from .._C import (
           get_tma_aligned_size,
           get_mn_major_tma_aligned_tensor,
           # ...
       )
   except ImportError:
       pass

   # these ones are always available
   from .._C import (
       set_mk_alignment_for_contiguous_layout,
       get_mk_alignment_for_contiguous_layout,
   )
   ```
5. **Users get `AttributeError` on tensor-map kernels under old CUDA**, but any direct attribute check (`hasattr(deep_gemm, 'fp8_gemm_nt')`) tells them unambiguously whether the path is available. No corrupt state, no module-level import crash.

## Evidence (from DeepGEMM)
- `csrc/utils/compatibility.hpp:8-14`: the version macros (`DG_FP8_COMPATIBLE`, `DG_TENSORMAP_COMPATIBLE`).
- `deep_gemm/__init__.py:34-81`: top-level guarded import block, with the explicit comment:
  ```python
  # Expected behavior for CUDA runtime version before 12.1
  ```
- `deep_gemm/utils/layout.py:1-17`: the sub-module repeats the pattern so re-exports are independently gated.

## Counter / Caveats
- **Swallowing `ImportError` silently can mask real bugs.** If you also hit `ImportError` because a *different* dependency is missing, your user gets a confusing `AttributeError: module has no attribute fp8_gemm_nt` later. Add `print(f'Failed to load FP8 kernels: {e}')` at least in debug mode.
- **`except ImportError:` catches all import errors including `ImportError: numpy.core.multiarray failed to import`** — broader than you want. If you can, catch `ImportError` and verify `'undefined symbol' in str(e)` before swallowing.
- **Your type stubs (`.pyi`) declare all symbols unconditionally.** Static analyzers see the symbols as always-present. Reviewers won't catch the guarded path just from types.
- **This is not the pattern for optional features** — it's for version-gated availability. For truly optional dependencies (e.g. only install triton stuff if triton is installed), use the same try/except but also gate on `importlib.util.find_spec`.
