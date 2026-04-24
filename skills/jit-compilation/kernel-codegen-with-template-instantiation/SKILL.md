---
name: kernel-codegen-with-template-instantiation
description: Generate CUDA kernel code at runtime by embedding explicit template instantiations that NVCC/NVRTC extracts into concrete kernels, avoiding template bloat while keeping config compile-time.
category: jit-compilation
version: 1.0.0
version_origin: extracted
tags: [code-generation, cuda-templates, jit, kernel-instantiation, compile-time-config]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit_kernels/impls/sm90_fp8_gemm_1d1d.hpp
  - csrc/jit_kernels/impls/sm100_fp8_fp4_gemm_1d1d.hpp
  - csrc/jit/compiler.hpp
imported_at: 2026-04-18T13:12:58Z
---

# Kernel Codegen With Template Instantiation

## What / Why
Author kernels as C++ templates parameterized by block sizes, cluster config, pipeline stages, and data types. At runtime, generate a small `.cu` source that `&takes-the-address-of` one explicit instantiation with the chosen parameters. NVCC/NVRTC then emits exactly one kernel function per unique config, and the cache keys it by hash of (name, signature, flags, code). This keeps templates general without paying template-instantiation cost for every shape at library build time.

## Procedure
1. Keep the kernel template (`sm90_fp8_gemm_1d1d_impl<...>`) behind a header; never pre-instantiate every combination.
2. At dispatch time, resolve all runtime config via heuristics (block M/N, num stages, cluster shape, gmm type).
3. Use `fmt::format()` to build a short source file that includes the impl header and writes `&sm90_fp8_gemm_1d1d_impl<BLOCK_M, BLOCK_N, ..., GemmType::Normal>` as a referenced symbol so the compiler must instantiate it.
4. Pre-compute and cache the include-file hash (lazy static) and prepend it as a comment so the cache key invalidates when headers change.
5. Pass the generated source to the compilation path (`csrc/jit/compiler.hpp`) which compiles via NVCC (CUBIN) or NVRTC, stores under hashed cache dir.
6. On subsequent dispatches with identical config, skip codegen and load the CUBIN directly.

## Key design points
- One kernel per unique config, not per unique shape — shapes flow through runtime args.
- `get_compiled_dim(dim, 'm', compiled_dims)` returns `0` (runtime) or the dim (compile-time) depending on whether the dim is "frozen" in the template parameters. Lets the same template cover both patterns.
- Enum stringification (`to_string(GemmType::Normal)`) ensures the generated code is human-readable and diff-friendly.

## References
- `csrc/jit_kernels/impls/sm90_fp8_gemm_1d1d.hpp` — template + codegen emitter.
- `csrc/jit_kernels/impls/sm100_fp8_fp4_gemm_1d1d.hpp` — SM100 variant with UE8M0 packing.
- `csrc/jit/compiler.hpp` — compile-and-cache pipeline.
