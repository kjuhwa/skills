---
name: distributed-filesystem-safe-atomic-cache-with-fsync
description: Make a JIT compiler cache safe under concurrent multi-rank writes on NFS by compiling to a tmp dir, fsyncing recursively, and atomically renaming the directory.
category: jit-compilation
version: 1.0.0
version_origin: extracted
tags: [concurrency, distributed-systems, cache, filesystem, jit]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit/compiler.hpp
imported_at: 2026-04-18T13:12:58Z
---

# Distributed-Filesystem-Safe Atomic Cache With fsync

## What / Why
When multiple ranks of a training job share a JIT cache on a network filesystem, naive "write file then hope" patterns corrupt the cache: half-written `.cubin`, stale inodes, races between ranks. The fix is single-step atomic commit: compile into a private temp directory, fsync everything, then `rename(tmp_dir, cache_dir)`. Rename of a directory is atomic on most filesystems (local, NFSv4, Lustre) — exactly one rank wins.

## Procedure
1. **Key.** Compute `cache_key = hash(name + signature + flags + code + include_hash)`; use as the final cache directory name.
2. **Fast-path hit.** If `cache_dir` exists and `KernelRuntime::check_validity(cache_dir)` passes (kernel.cu + kernel.cubin both present), load and return.
3. **Compile into tmp.** `tmp_dir = make_tmp_dir()` → random UUID path, sibling of `cache_dir`. Compile the kernel there (`kernel.cu` → `kernel.cubin` via NVCC or NVRTC).
4. **Fsync.** Walk the tmp dir, `fsync()` every file; then `fsync()` the dir itself. On NFS this forces server-side durability so peers see the contents post-rename.
5. **Atomic commit.** `std::filesystem::rename(tmp_dir, cache_dir, ec)`. If the rename fails with `EEXIST`/`ENOTEMPTY` (peer beat us), call `safe_remove_all(tmp_dir)` (wrapped `rm -rf` that ignores ENOENT).
6. **Re-read from canonical path.** Either way, load the runtime from `cache_dir` — guarantees every rank ends up with bit-identical bytes.

## Key design points
- **Directory rename, not file rename.** Per-file rename has race windows where the cache dir is partially populated; directory rename is all-or-nothing.
- **fsync is mandatory on NFS.** Without it, readers may see an empty file or a dir with zero-byte children.
- **`safe_remove_all` is the right loser behavior.** Don't error out; the winner's cache is what you want anyway.

## Anti-pattern (don't do this)
```cpp
// BAD: per-file write + rename has a window where cache_dir is half-populated
write(cache_dir / "kernel.cu");
write(cache_dir / "kernel.cubin");  // crash here → corrupted cache
```

## References
- `csrc/jit/compiler.hpp` — `compile()` with atomic rename path.
- `csrc/jit/kernel_runtime.hpp` — `check_validity()` guard used on the fast path.
