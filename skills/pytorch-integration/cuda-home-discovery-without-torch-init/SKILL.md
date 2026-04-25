---
name: cuda-home-discovery-without-torch-init
description: Discover CUDA_HOME at module import time without touching PyTorch's internal cuda-home helper, because in some versions it initializes CUDA — which then breaks subsequent `multiprocessing` forks.
category: pytorch-integration
version: 1.0.0
version_origin: extracted
tags: [cuda-home, pytorch, multiprocessing, fork-safety, import-time]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - deep_gemm/__init__.py
imported_at: 2026-04-18T13:30:00Z
---

# Discover CUDA_HOME Without Initializing CUDA

## When to use
Your package's `__init__.py` needs a CUDA toolkit path (for NVCC invocations or include dirs) at import time. The obvious call is `torch.utils.cpp_extension._find_cuda_home()`. In some PyTorch versions that function touches `torch.cuda`, which eagerly initializes the CUDA driver on the parent process. Later `torch.multiprocessing.spawn`-style forks then fail with:
```
RuntimeError: Cannot re-initialize CUDA in forked subprocess. To use CUDA with multiprocessing, you must use the 'spawn' start method
```
You need a fallback that is fork-safe.

## Steps
1. **Environment first.** Check the standard vars:
   ```python
   cuda_home = os.environ.get('CUDA_HOME') or os.environ.get('CUDA_PATH')
   ```
2. **Fallback: `which nvcc`**, then walk two directories up:
   ```python
   if cuda_home is None:
       try:
           with open(os.devnull, 'w') as devnull:
               nvcc = subprocess.check_output(['which', 'nvcc'], stderr=devnull).decode().rstrip('\r\n')
               cuda_home = os.path.dirname(os.path.dirname(nvcc))
       except Exception:
           cuda_home = None
   ```
   `which` is a subprocess — it doesn't touch PyTorch's CUDA state at all.
3. **Final fallback: `/usr/local/cuda`** (the canonical Linux default), but *only if it exists*:
   ```python
   if cuda_home is None:
       cuda_home = '/usr/local/cuda'
       if not os.path.exists(cuda_home):
           cuda_home = None
   ```
4. **Assert and pass through.** `assert cuda_home is not None, 'CUDA_HOME could not be discovered'`.
5. **Do NOT import `torch.utils.cpp_extension`** during this discovery. Even importing sometimes drags in parts of `torch.cuda`. Save that import for actual build time, not import time.
6. **Pass the discovered path into your JIT init.** For DeepGEMM that's:
   ```python
   _C.init(
       os.path.dirname(os.path.abspath(__file__)),  # library root
       _find_cuda_home()                            # CUDA home
   )
   ```

## Evidence (from DeepGEMM)
- `deep_gemm/__init__.py:103-118`: the full `_find_cuda_home()`. The top comment is explicit:
  ```python
  # For some PyTorch versions, the original `_find_cuda_home` will initialize CUDA,
  # which is incompatible with process forks
  ```
- `deep_gemm/__init__.py:121-124`: the single-call initialization of the C++ extension.

## Counter / Caveats
- **Windows doesn't have `which`**, use `where.exe` or skip to the filesystem check. DeepGEMM is Linux-only so it doesn't branch.
- **`/usr/local/cuda` can be a symlink to a specific version** (`cuda-12.9`). That's fine — `os.path.exists` returns True on valid symlinks.
- **If you find `nvcc` but the sibling `include/` is missing**, you discovered a broken install. Add a secondary `os.path.exists(os.path.join(cuda_home, 'include'))` check if your caller assumes it.
- **`torch.version.cuda` is a different question** — that's the CUDA version PyTorch was built against, not the installed toolkit. Don't conflate them.
