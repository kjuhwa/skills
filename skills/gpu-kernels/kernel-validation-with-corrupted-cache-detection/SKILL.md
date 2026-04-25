---
name: kernel-validation-with-corrupted-cache-detection
description: On JIT cache load, validate that every expected artifact (kernel.cu + kernel.cubin) is present and abort with an actionable 'rm -rf CACHE_PATH' error if not.
category: gpu-kernels
version: 1.0.0
version_origin: extracted
tags: [error-handling, cache-management, jit, debugging, fail-fast]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit/kernel_runtime.hpp
imported_at: 2026-04-18T13:12:58Z
---

# Kernel Validation With Corrupted-Cache Detection

## What / Why
A JIT cache with an empty entry (compilation interrupted, SIGKILL, out-of-disk) is worse than no cache: the load path silently succeeds with garbage and fails deep in `cuModuleLoad` with an opaque error. Validate the cache-directory contents *before* trying to use them, and fail fast with a message that tells the user exactly how to recover.

## Procedure
1. **Define expected artifacts** per compile path:
   - NVCC path: `kernel.cu`, `kernel.cubin` (plus optional `kernel.ptx`).
   - NVRTC path: `kernel.cu`, `kernel.cubin` from in-memory compile.
2. **Validate at load.**
   ```cpp
   static bool check_validity(const std::filesystem::path& dir) {
       if (!std::filesystem::exists(dir)) return false;
       if (!std::filesystem::exists(dir / "kernel.cu"))    return false;
       if (!std::filesystem::exists(dir / "kernel.cubin")) return false;
       return true;
   }
   ```
3. **On validation failure** inside the runtime constructor (not check_validity, which just returns bool): abort with a specific message:
   ```
   Corrupted JIT cache directory (missing kernel.cu or kernel.cubin): <path>,
   please run `rm -rf <path>` and restart your task.
   ```
4. **Fast-path hit** uses check_validity to decide whether to skip the compile; this also means a half-populated dir forces recompilation, healing itself.

## Key design points
- Include the directory path in the error — grep-able and directly actionable.
- Point to `rm -rf` explicitly; don't make the user guess whether it's safe to delete.
- Don't auto-delete corrupt caches without user confirmation — a disk fault could mask a deeper issue.

## References
- `csrc/jit/kernel_runtime.hpp` — `KernelRuntime::check_validity` and the assert site.
