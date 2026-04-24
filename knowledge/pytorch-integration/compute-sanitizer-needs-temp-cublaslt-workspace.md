---
name: compute-sanitizer-needs-temp-cublaslt-workspace
type: knowledge
category: pitfall
confidence: medium
source: DeepGEMM
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit/device_runtime.hpp
tags: [compute-sanitizer, cublaslt, teardown, cuda-runtime, destructor, workspace]
imported_at: 2026-04-18T13:30:00Z
---

# compute-sanitizer Needs Per-Call cuBLASLt Workspace (Destructor-Ordering Pitfall)

## Fact / Decision
A library that holds a persistent `torch::Tensor` cuBLASLt workspace (32 MB, allocated once at module init) hits `cudaErrorCudartUnloading` during process teardown when running under `compute-sanitizer` (or any tool that shuts down CUDA driver before user-code destructors run).

The fix: conditionally allocate a temporary workspace per call instead of reusing a persistent one. Controlled by env var `DG_USE_TEMP_CUBLASLT_WORKSPACE=1`.

## Why it matters
- At normal process exit, PyTorch tears down CUDA in a specific order that's friendly to user-code destructors.
- `compute-sanitizer` intercepts the tear-down sequence and unloads the CUDA runtime earlier than usual.
- When your global `DeviceRuntime` destructor runs `cublaslt_workspace` falls out of scope, `~Tensor()` tries `cudaFree`, and the runtime is already gone → `cudaErrorCudartUnloading`.
- The error is non-fatal but surfaces as `RuntimeError: CUDA error: cudart unloading` in sanitizer reports, masking real issues.

Per-call workspace allocation avoids the problem because the tensor is scoped to the cuBLASLt call and destructed before the sanitizer ever sees it.

## Evidence
- `csrc/jit/device_runtime.hpp:34-49`: the env var read and the explicit comment:
  ```cpp
  // Whether to create workspace tensor on each call instead of holding one.
  // Enabled by compute-sanitizer tests, which trigger `cudaErrorCudartUnloading`
  // when the workspace tensor is destructed after CUDA driver shutdown.
  use_temp_cublaslt_workspace = get_env<int>("DG_USE_TEMP_CUBLASLT_WORKSPACE", 0) > 0;
  ```
- `csrc/jit/device_runtime.hpp:66-70`: the per-call allocation branch in `get_cublaslt_workspace()`.

## Caveats / When this doesn't apply
- **Only affects compute-sanitizer and similar teardown-interceptors.** Normal `pytest` runs don't trigger this — don't enable the workaround by default, or you pay the per-call allocation cost unnecessarily.
- **Same class of issue exists for the cuBLASLt handle**, but `cublasLtDestroy` on an already-torn-down runtime is typically reported as a return-code error, not a cuda-unload error. DeepGEMM uses `noexcept(false)` on the destructor so the error can propagate.
- **PyTorch's own `at::cuda::getCurrentCUDABlasLtHandle`** might have a different behavior under sanitizer (since it's managed by PyTorch's tear-down order). Testing under sanitizer should cover both handle modes.
- **Per-call allocation is ~300ns overhead** in the PyTorch caching allocator — negligible for real workloads but measurable on a microbench of 10M small GEMMs.
