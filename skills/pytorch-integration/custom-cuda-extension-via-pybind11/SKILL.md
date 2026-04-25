---
name: custom-cuda-extension-via-pybind11
description: Expose C++/CUDA kernels to PyTorch via a single pybind11 module grouped by API family, then re-export into a Python package.
category: pytorch-integration
version: 1.0.0
version_origin: extracted
tags: [pytorch, pybind11, cuda-extension, python-bindings, packaging]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/python_api.cpp
  - deep_gemm/__init__.py
  - setup.py
imported_at: 2026-04-18T13:12:58Z
---

# Custom CUDA Extension via pybind11

## What / Why
Cleanly separate kernel implementations (C++/CUDA) from user-facing API (Python) while keeping the binding surface small. A single `PYBIND11_MODULE(TORCH_EXTENSION_NAME, m)` entry point delegates to per-family `register_apis(m)` calls (GEMM, attention, MoE, layout). The Python package imports `_C` and re-exports selected symbols, hiding the native-module boundary from users.

## Procedure
1. **One binding entry point.**
   ```cpp
   PYBIND11_MODULE(TORCH_EXTENSION_NAME, m) {
       deep_gemm::apis::gemm::register_apis(m);
       deep_gemm::apis::attention::register_apis(m);
       deep_gemm::apis::layout::register_apis(m);
   }
   ```
2. **Per-family registration** in each header/impl: `register_apis(m)` calls `m.def("fp8_gemm_nt", &fp8_gemm_nt, ...)`. Functions take `torch::Tensor` and return `torch::Tensor` — pybind11 + torch conversions are automatic.
3. **Build with CMake** invoked from `setup.py`. `TORCH_EXTENSION_NAME` is passed through so the produced `.so`/`.pyd` matches the expected module name.
4. **Python re-export** in `deep_gemm/__init__.py`:
   ```python
   from . import _C
   fp8_gemm_nt = _C.fp8_gemm_nt
   ```
   Wrap with `try/except` for optional features (e.g., SM80-only kernels).
5. **Environment overrides** exposed via module-level setters: `set_pdl()`, `set_num_sms()`, `CUDA_HOME`, JIT cache dir.

## Key design points
- Keep `_C` private — users should import names from the Python package, never from `_C` directly.
- Group `m.def` calls by API family so adding a new family is one `register_apis` call.
- Don't leak CUTLASS/CUTE types across the pybind boundary — convert to `torch::Tensor` or plain POD at the edge.

## References
- `csrc/python_api.cpp` — module entry point.
- `deep_gemm/__init__.py` — Python re-export layer.
- `setup.py` — CMake-driven build wiring `TORCH_EXTENSION_NAME`.
