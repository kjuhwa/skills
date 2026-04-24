---
name: lazy-initialization-of-cuda-driver-symbols
description: Resolve CUDA driver-API symbols on first call via dlopen+dlsym so your library loads on systems missing newer symbols and surfaces clean errors when features are unavailable.
category: jit-compilation
version: 1.0.0
version_origin: extracted
tags: [cuda-driver-api, lazy-loading, dynamic-linking, portability]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit/handle.hpp
imported_at: 2026-04-18T13:12:58Z
---

# Lazy Initialization of CUDA Driver Symbols

## What / Why
Linking directly against `libcuda.so` means a missing symbol (e.g., `cuTensorMapEncodeTiled` on older drivers) is a hard load failure of your `.so` — users can't even `import` the module to get a nice error. Instead, `dlopen("libcuda.so.1")` once, then `dlsym()` each symbol on first use and cache the function pointer. Missing symbols become runtime asserts with clear messages, scoped to the feature that needed them.

## Procedure
1. **Singleton handle.**
   ```cpp
   static void* get_driver_handle() {
       static void* h = dlopen("libcuda.so.1", RTLD_LAZY);
       DG_HOST_ASSERT(h, "libcuda.so.1 not found");
       return h;
   }
   ```
2. **Macro-generated lazy wrappers.**
   ```cpp
   #define DECL_LAZY_CUDA_DRIVER_FUNCTION(name) \
       template <typename... Args> \
       auto lazy_##name(Args... args) { \
           using fn_t = decltype(&name); \
           static fn_t fn = reinterpret_cast<fn_t>(dlsym(get_driver_handle(), #name)); \
           DG_HOST_ASSERT(fn, "Driver symbol " #name " missing — need CUDA 12.x+"); \
           return fn(args...); \
       }
   ```
3. **Declare once per symbol** you need: `DECL_LAZY_CUDA_DRIVER_FUNCTION(cuTensorMapEncodeTiled);` etc.
4. **Call `lazy_X(...)` everywhere** you'd have called `X(...)`. Static-cached pointer → no measurable overhead after first call.

## Key design points
- Use `RTLD_LAZY` — the handle itself is cheap; only referenced symbols actually resolve.
- The assert message should name the symbol and hint at the required driver version.
- Don't use `dlerror()` globally — the return value of `dlsym` is the check you want.
- For Windows, swap to `LoadLibrary` + `GetProcAddress`; same shape.

## References
- `csrc/jit/handle.hpp` — full macro + symbols used (`cuModuleLoad`, `cuLaunchKernelEx`, `cuTensorMapEncodeTiled`, …).
