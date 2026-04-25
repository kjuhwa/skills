---
version: 0.1.0-draft
name: culibraryenumerate-needs-cuda-12-4
description: If you want to load a `.cubin` without knowing the kernel's symbol name ahead of time, use `cuLibraryLoadFromFile` +...
type: knowledge
category: version-quirk
confidence: high
source: DeepGEMM
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit/handle.hpp
  - csrc/jit/kernel_runtime.hpp
tags: [cuda-version, culibrary, driver-api, kernel-loading, cuobjdump]
imported_at: 2026-04-18T13:30:00Z
---

# `cuLibraryEnumerateKernels` Needs CUDA Driver ≥ 12.4

## Fact / Decision
If you want to load a `.cubin` without knowing the kernel's symbol name ahead of time, use `cuLibraryLoadFromFile` + `cuLibraryEnumerateKernels` + `cuKernelGetFunction`. This avoids invoking `cuobjdump -symbols` as a subprocess at load time. But the enumerate API was added in CUDA Driver 12.4 — on older drivers you must fall back to the old path: run `cuobjdump` to list symbols, filter out the 4 internal names (`vprintf`, `__instantiate_kernel`, `__internal`, `__assertfail`), assert exactly one remains, then `cuModuleGetFunction(module, name)`.

## Why it matters
The old symbol-scraping path is functional but has three costs:
1. **Forking `cuobjdump` is slow** (~10-20ms) — on a kernel-per-call hot path this adds up.
2. **Symbol name is compiler-mangled** — NVCC and NVRTC may produce different mangling, you need the exact string.
3. **"Exactly one symbol after filtering" assertion** is fragile. A kernel that internally calls a helper gets two symbols; you have to maintain the internal-name blocklist.

The new API sidesteps all three by asking the driver "how many entry points are in this cubin? give me them".

## Evidence
- `csrc/jit/handle.hpp:123-131`:
  ```cpp
  // `cuLibraryEnumerateKernels` is supported since CUDA Driver API 12.4
  #if CUDA_VERSION >= 12040
      #define DG_JIT_USE_LIBRARY_ENUM_KERNELS
      DECL_LAZY_CUDA_DRIVER_FUNCTION(cuLibraryGetKernelCount);
      DECL_LAZY_CUDA_DRIVER_FUNCTION(cuLibraryEnumerateKernels);
      using LibraryHandle = CUlibrary;
  #else
      using LibraryHandle = CUmodule;
  #endif
  ```
- `csrc/jit/handle.hpp:140-154`: the enumerate path under `DG_JIT_USE_LIBRARY_ENUM_KERNELS`.
- `csrc/jit/kernel_runtime.hpp:56-82`: the fallback path — explicit `cuobjdump -symbols`, string parsing, blocklist filter, one-symbol assertion.

## Caveats / When this doesn't apply
- **The `CUlibrary` vs `CUmodule` type change is load-bearing.** If you mix a `CUlibrary` loaded file with `cuModuleGetFunction`, you get cryptic errors. The `using LibraryHandle = ...` alias lets the rest of the code be version-agnostic.
- **CUDA 12.4 is *driver*, not toolkit.** Users can have CUDA Toolkit 12.4 with Driver 12.2 (nvidia-driver packages lag). Check both with `cudaDriverGetVersion()`.
- **Some cubins legitimately have multiple kernels.** The `num_kernels != 1` check in DeepGEMM is specific to its "one kernel per cubin" JIT convention — general libraries that load fat binaries shouldn't assert this.
- **Lazy-loading CUDA driver functions via `dlsym`** is the clean way to support both paths in one binary without compile-time branch — the symbol just happens to not resolve on older drivers, and you get a runtime assertion instead of a link failure.
