---
name: template-parameter-codegen-with-enum-stringification
description: When generating kernel sources at runtime, stringify enums and compile-time dims via helpers (to_string, get_compiled_dim) so the emitted code is valid C++ and human-diff-able.
category: jit-compilation
version: 1.0.0
version_origin: extracted
tags: [code-generation, template-metaprogramming, enum, compile-time-config]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit_kernels/impls/sm90_fp8_gemm_1d1d.hpp
  - csrc/jit_kernels/impls/runtime_utils.hpp
imported_at: 2026-04-18T13:12:58Z
---

# Template-Parameter Codegen With Enum Stringification

## What / Why
Generated kernel source needs valid C++ template arguments — `GemmType::Normal`, `cutlass::float_e4m3_t`, literal `128` — not `(int)GemmType::Normal` or raw ints. Write small `to_string` helpers that convert runtime enum values into their canonical C++ spellings, plus a `get_compiled_dim` that decides whether a dim flows through the template (compile-time) or stays as a runtime kernel arg (dim = 0 sentinel).

## Procedure
1. **Overload `to_string` per enum** with a switch returning string literals:
   ```cpp
   std::string to_string(GemmType t) {
       switch (t) {
           case GemmType::Normal:              return "GemmType::Normal";
           case GemmType::MGroupedContiguous:  return "GemmType::MGroupedContiguous";
           /* ... */
       }
   }
   std::string to_string(at::ScalarType s) {
       switch (s) {
           case at::kFloat8_e4m3fn:  return "cutlass::float_e4m3_t";
           case at::kPackedFP4:      return "cutlass::detail::float_e2m1_unpacksmem_t";
           /* ... */
       }
   }
   ```
2. **Compile-time vs runtime dims.**
   ```cpp
   int get_compiled_dim(int dim, char axis, const std::string& compiled_dims) {
       return compiled_dims.find(axis) != std::string::npos ? dim : 0;
   }
   ```
   If `compiled_dims` contains `'m'`, `M` flows through the template; otherwise `0` means the kernel reads it from args.
3. **Emit via fmt::format.**
   ```cpp
   auto code = fmt::format(R"(
       #include "sm90_fp8_gemm_1d1d_impl.hpp"
       auto kernel = &sm90_fp8_gemm_1d1d_impl<
           /*BLOCK_M=*/{}, /*BLOCK_N=*/{}, /*BLOCK_K=*/{},
           /*M=*/{}, /*N=*/{}, /*K=*/{},
           {}, {}, {}
       >;
   )", block_m, block_n, block_k,
      get_compiled_dim(m, 'm', cd), get_compiled_dim(n, 'n', cd), get_compiled_dim(k, 'k', cd),
      to_string(dtype_a), to_string(dtype_b), to_string(gemm_type));
   ```
4. **Compile and hash** as in `kernel-codegen-with-template-instantiation`.

## Key design points
- One switch per enum — NOT a `map<Enum, string>` — keeps the switch exhaustive (compiler warns on missing case).
- Readable `fmt::format` comments (`/*BLOCK_M=*/`) make diffs of generated source tractable.
- `get_compiled_dim` returning 0 works only if the template implementation treats `0` as a sentinel meaning "runtime value." Document that contract next to the template.

## References
- `csrc/jit_kernels/impls/runtime_utils.hpp` — helper definitions.
- `csrc/jit_kernels/impls/sm90_fp8_gemm_1d1d.hpp` — codegen site using the helpers.
