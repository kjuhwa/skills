---
name: dual-mode-cublaslt-handle-workspace
description: Manage a cuBLASLt handle + workspace two ways (self-owned vs PyTorch-managed, persistent vs per-call) so your library works under compute-sanitizer, older PyTorch versions, and high-throughput prod builds — selected by env var at init.
category: pytorch-integration
version: 1.0.0
version_origin: extracted
tags: [cublaslt, pytorch, workspace, compute-sanitizer, handle-management]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit/device_runtime.hpp
imported_at: 2026-04-18T13:30:00Z
---

# Dual-Mode cuBLASLt Handle And Workspace Management

## When to use
You embed cuBLASLt calls in a PyTorch extension. The "obvious" pattern — `at::cuda::getCurrentCUDABlasLtHandle()` + one reusable `torch::Tensor` workspace — breaks in three places:
1. **Older PyTorch** (pre-2.3) doesn't expose `getCurrentCUDABlasLtHandle`.
2. **`at::cuda::getCurrentCUDABlasLtHandle` has measurable CPU overhead** in some PyTorch versions — you don't want that on the critical path of small-shape GEMMs.
3. **`compute-sanitizer`** shuts down the CUDA runtime before your workspace tensor's destructor runs, triggering `cudaErrorCudartUnloading` as your destructor runs `cudaFree`.

You need all four (handle, workspace) × (self-managed, PyTorch-managed) or (persistent, per-call) combinations to be reachable by env var without recompiling.

## Steps
1. **Compile-time feature gate** for the PyTorch handle helper:
   ```cpp
   #define PYTORCH_SUPPORTS_GET_CUBLASLT_HANDLE \
       (TORCH_VERSION_MAJOR > 2 or (TORCH_VERSION_MAJOR == 2 and TORCH_VERSION_MINOR >= 3))
   ```
2. **Two boolean flags, two env vars:**
   ```cpp
   use_pytorch_managed_cublaslt_handle = get_env<int>("DG_USE_PYTORCH_CUBLASLT_HANDLE", 0) > 0;
   use_temp_cublaslt_workspace         = get_env<int>("DG_USE_TEMP_CUBLASLT_WORKSPACE",  0) > 0;
   ```
   Defaults: self-owned handle + persistent workspace. Both flags are independent — four combinations.
3. **At init, assert the compile-time support lines up with the runtime flag:**
   ```cpp
   #if not PYTORCH_SUPPORTS_GET_CUBLASLT_HANDLE
   DG_HOST_ASSERT(not use_pytorch_managed_cublaslt_handle
                  and "PyTorch does not support getting the cuBLASLt handle");
   #endif
   ```
4. **Create a self-owned handle lazily (in the constructor)** unless PyTorch is managing it:
   ```cpp
   if (not use_pytorch_managed_cublaslt_handle)
       DG_CUBLASLT_CHECK(cublasLtCreate(&cublaslt_handle));
   ```
   Destructor must symmetrically destroy, but only if we created it.
5. **Create the persistent workspace on the CUDA device**, unless `temp` mode:
   ```cpp
   if (not use_temp_cublaslt_workspace)
       cublaslt_workspace = torch::empty({kCublasLtWorkspaceSize},
                                          dtype(torch::kByte).device(at::kCUDA));
   ```
6. **Accessor functions read the flags:**
   ```cpp
   cublasLtHandle_t get_cublaslt_handle() const {
       if (use_pytorch_managed_cublaslt_handle)
           return at::cuda::getCurrentCUDABlasLtHandle();
       return cublaslt_handle;
   }
   torch::Tensor get_cublaslt_workspace() const {
       if (use_temp_cublaslt_workspace)
           return torch::empty({kCublasLtWorkspaceSize}, dtype(torch::kByte).device(at::kCUDA));
       return cublaslt_workspace;
   }
   ```
7. **Document the compute-sanitizer workflow** — "set `DG_USE_TEMP_CUBLASLT_WORKSPACE=1` when running `compute-sanitizer`" — so users don't chase the `cudaErrorCudartUnloading` error.

## Evidence (from DeepGEMM)
- `csrc/jit/device_runtime.hpp:9-10`: the PYTORCH_SUPPORTS_GET_CUBLASLT_HANDLE version gate.
- `csrc/jit/device_runtime.hpp:31-49`: the env var reads, compile-time assertion, and the two independent object allocations.
- `csrc/jit/device_runtime.hpp:40-42`: the compute-sanitizer rationale in a comment ("triggers `cudaErrorCudartUnloading` when the workspace tensor is destructed after CUDA driver shutdown").
- `csrc/jit/device_runtime.hpp:56-70`: the two accessors with branch on flag.

## Counter / Caveats
- **`at::cuda::getCurrentCUDABlasLtHandle` in modern PyTorch has been optimized.** On PyTorch ≥ 2.4 the overhead is sub-microsecond, so the default flip back to PyTorch-managed may make sense once you drop older support.
- **Creating a 32 MB per-call workspace is expensive** — `torch::empty` allocates via the PyTorch caching allocator, which is fast, but the tensor bookkeeping is not free. Only enable `temp` mode when you have to.
- **Two boolean flags → four combinations**, but not all are equally useful. Persistent workspace + PyTorch handle is the standard prod config. Document which combinations are tested.
