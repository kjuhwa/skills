---
version: 0.1.0-draft
name: torch-cpp-extension-cuda-home-init-fork-issue
description: In some PyTorch versions, calling `torch.utils.cpp_extension._find_cuda_home()` as part of module import touches `tor...
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
  - deep_gemm/__init__.py
tags: [pytorch, cuda-home, fork, multiprocessing, import-time]
imported_at: 2026-04-18T13:30:00Z
---

# `torch.utils.cpp_extension._find_cuda_home` Can Initialize CUDA — Breaks Fork

## Fact / Decision
In some PyTorch versions, calling `torch.utils.cpp_extension._find_cuda_home()` as part of module import touches `torch.cuda`, which eagerly initializes the CUDA driver in the parent process. Once CUDA is initialized in the parent, `torch.multiprocessing.spawn` (and any `fork` start-method) fails with:
```
Cannot re-initialize CUDA in forked subprocess
```

If your package uses `_find_cuda_home` at import time just to get the CUDA path for a JIT compiler, do *not* call PyTorch's helper. Write your own that uses `os.environ['CUDA_HOME']` + `subprocess.check_output(['which', 'nvcc'])` + filesystem probe.

## Why it matters
- Training scripts using `torch.multiprocessing.spawn` are the standard multi-GPU pattern.
- If your JIT library is imported at the top of the user's script (before `spawn`), your CUDA initialization poisons the parent.
- The symptom is not your library — it's the user's `spawn` call failing, which is hard to trace back.
- DeepGEMM's `_find_cuda_home` replacement explicitly avoids `torch.cuda` and `torch.utils.cpp_extension`:
  ```python
  def _find_cuda_home() -> str:
      # TODO: reuse PyTorch API later
      # For some PyTorch versions, the original `_find_cuda_home` will initialize CUDA,
      # which is incompatible with process forks
      cuda_home = os.environ.get('CUDA_HOME') or os.environ.get('CUDA_PATH')
      if cuda_home is None:
          try:
              nvcc = subprocess.check_output(['which', 'nvcc'], stderr=subprocess.DEVNULL).decode().rstrip('\r\n')
              cuda_home = os.path.dirname(os.path.dirname(nvcc))
          except Exception:
              cuda_home = '/usr/local/cuda'
              if not os.path.exists(cuda_home):
                  cuda_home = None
      assert cuda_home is not None
      return cuda_home
  ```

## Evidence
- `deep_gemm/__init__.py:103-118`: the workaround, with its comment explicitly calling out the fork incompatibility.

## Caveats / When this doesn't apply
- **Recent PyTorch may have fixed this.** The `TODO: reuse PyTorch API later` comment hints the workaround is version-specific. If your minimum supported PyTorch is new enough, you can drop it — but test with `spawn` first.
- **Users who don't use `spawn`** (they use `torchrun` which uses `execve`, no fork) aren't affected. If your library is only used in those contexts, you can use `torch.utils.cpp_extension._find_cuda_home` freely.
- **Environment-based discovery misses some installs.** Conda environments sometimes have CUDA under `$CONDA_PREFIX/pkgs/cuda-...` without setting `CUDA_HOME`. Your fallback chain should probe common locations.
- **`/usr/local/cuda` as the last-resort default** is Linux convention; on other OSes this is wrong.
