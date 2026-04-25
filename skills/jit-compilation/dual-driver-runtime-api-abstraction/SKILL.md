---
name: dual-driver-runtime-api-abstraction
description: Hide the CUDA Driver API vs Runtime API split behind a single `load_kernel` / `launch_kernel` / `construct_launch_config` surface, using typedefs and `#ifdef` to pick the implementation at compile time.
category: jit-compilation
version: 1.0.0
version_origin: extracted
tags: [cuda, driver-api, runtime-api, abstraction, jit, portability]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit/handle.hpp
  - csrc/jit/kernel_runtime.hpp
imported_at: 2026-04-18T13:30:00Z
---

# Dual Driver/Runtime API Abstraction For JIT Kernel Loading

## When to use
You have a JIT runtime that must ship as a single library but support two target platforms:
- Older CUDA toolchains (driver-only: `cuModuleLoad`, `cuLaunchKernelEx`, `CUfunction`).
- Newer CUDA toolchains (runtime API: `cudaLibraryLoadFromFile`, `cudaLaunchKernelExC`, `cudaKernel_t`) where the runtime API is preferred because PyTorch/Triton already initialize it.

A naive codebase sprinkles `#ifdef` across every call site. This skill isolates the split to one header.

## Steps
1. **Pick a single variable name per concept.** Typedef:
   ```cpp
   using LibraryHandle    = /* CUmodule / CUlibrary / cudaLibrary_t */;
   using KernelHandle     = /* CUfunction / cudaKernel_t */;
   using LaunchConfigHandle = /* CUlaunchConfig / cudaLaunchConfig_t */;
   using LaunchAttrHandle = /* CUlaunchAttribute / cudaLaunchAttribute */;
   ```
2. **Gate the typedefs on a single define.**
   ```cpp
   #if CUDART_VERSION >= 12080 and defined(DG_JIT_USE_RUNTIME_API)
     // runtime API typedefs
   #else
     // driver API typedefs, with a nested #if CUDA_VERSION >= 12040
     // for the `cuLibraryEnumerateKernels` path
   #endif
   ```
3. **Wrap each operation with the same three functions:**
   - `load_kernel(cubin_path, func_name, &library_opt)` → `KernelHandle`
   - `unload_library(library)` → `void` (ignore `cudaErrorCudartUnloading` / `CUDA_ERROR_DEINITIALIZED`)
   - `construct_launch_config(kernel, stream, smem_size, grid, block, cluster_dim, enable_pdl)` → `LaunchConfigHandle`
   - `launch_kernel(kernel, config, args...)` variadic wrapper that builds `void *ptr_args[]`.
4. **Unify error handling** with one macro `DG_CUDA_UNIFIED_CHECK` that resolves to either `DG_CUDA_RUNTIME_CHECK` or `DG_CUDA_DRIVER_CHECK`. Callers write only `DG_CUDA_UNIFIED_CHECK(load_kernel(...));` and never branch.
5. **Keep driver symbols lazy-loaded** (via `dlsym` on `libcuda.so.1` — see the `DECL_LAZY_CUDA_DRIVER_FUNCTION` macro) so the library doesn't hard-link a driver symbol that may be absent in the runtime-API build.
6. **Use a static `LaunchAttrHandle attrs[N]`** inside `construct_launch_config`, then increment `config.numAttrs` as you add cluster / PDL attributes. Both APIs accept the same attribute layout by design.

## Evidence (from DeepGEMM)
- `csrc/jit/handle.hpp:48-114`: runtime-API branch uses `cudaLibraryLoadFromFile` + `cudaLibraryGetKernel`.
- `csrc/jit/handle.hpp:118-220`: driver-API branch uses `cuModuleLoad` / `cuLibraryLoadFromFile` depending on whether CUDA 12.4+ gives `cuLibraryEnumerateKernels` (then the kernel can be located by enumeration instead of a symbol name lookup).
- `csrc/jit/handle.hpp:89-107,192-210`: attribute-array setup is byte-for-byte identical across the two implementations — that is what lets the caller `LaunchRuntime::launch` be API-agnostic.
- `csrc/jit/kernel_runtime.hpp:141-162`: `LaunchRuntime<Derived>::launch` never mentions driver/runtime; it just calls `construct_launch_config` and `Derived::launch_impl`.

## Counter / Caveats
- **Driver symbols must stay `dlsym`-loaded.** If you link `cuLibraryLoadFromFile` directly, a system without that CUDA version will fail at process start — even for the runtime-API build path.
- **`cuLibraryEnumerateKernels` needs CUDA Driver 12.4+**, not just CUDA Toolkit 12.4. You need both runtime header and runtime driver available. DeepGEMM gates this with `#if CUDA_VERSION >= 12040` and falls back to symbol-name lookup.
- **Handles are not interchangeable across implementations.** A kernel loaded via the runtime API cannot be launched via `cuLaunchKernelEx`. Keep the abstraction total.
