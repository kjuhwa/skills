---
version: 0.1.0-draft
name: directory-rename-is-atomic-not-file-rename
description: When committing a multi-file JIT cache entry (`kernel.cu` + `kernel.cubin` + optional `.ptx`/`.sass`), rename the *co...
type: knowledge
category: decision
confidence: high
source: DeepGEMM
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit/compiler.hpp
  - csrc/jit/kernel_runtime.hpp
tags: [atomicity, rename, filesystem, distributed, jit-cache]
imported_at: 2026-04-18T13:30:00Z
---

# For Multi-File Cache Entries, Rename the *Directory*, Not the Files

## Fact / Decision
When committing a multi-file JIT cache entry (`kernel.cu` + `kernel.cubin` + optional `.ptx`/`.sass`), rename the *containing directory* from `tmp_xxx` to `cache_final_name` as the last atomic step. Do **not** create the final directory and write each file into it one by one — that creates a window where the directory exists but is partially populated, and a peer reader sees a "cache hit" that's actually broken.

## Why it matters
Directory rename (`rename(2)`) is atomic on POSIX-compliant local filesystems, NFSv4, Lustre, GPFS, and BeeGFS. Either the final path exists with all files, or it doesn't exist at all. There is no middle state.

Per-file rename is also atomic, but the *set* of per-file renames isn't — a reader that does `if exists(dir/A) and exists(dir/B)` can observe `A` before `B` lands. This is exactly the failure mode DeepGEMM's `check_validity` was built to detect:

```cpp
if (not std::filesystem::exists(dir / "kernel.cu")
    or not std::filesystem::exists(dir / "kernel.cubin")) {
    printf("Corrupted JIT cache directory (missing kernel.cu or kernel.cubin): ...");
    DG_HOST_ASSERT(false and "Corrupted JIT cache directory");
}
```

With the directory-rename pattern, this check should be unreachable — the directory either exists fully populated or doesn't exist. When it *does* trigger, it tells you someone used the wrong commit pattern (or manually edited the cache).

## Evidence
- `csrc/jit/compiler.hpp:108-149`: DeepGEMM's `build()` method. The key steps are (1) make tmp dir, (2) write all files into it, (3) fsync recursively, (4) `std::filesystem::rename(tmp_dir, final_dir)`. Comments spell out the reasoning:
  > NOTES: renaming a directory is atomic on both local and distributed filesystems, avoiding the stale inode issue that occurs when renaming individual files
- `csrc/jit/kernel_runtime.hpp:96-110`: `check_validity` — the runtime check that should never fail if the commit discipline holds.

## Caveats / When this doesn't apply
- **`rename` to an existing non-empty directory fails** with `EEXIST` / `ENOTEMPTY`. That's how you detect that another rank won the race — it's not an error, just means you lose and should clean up your tmp dir.
- **Moving across filesystems is not atomic.** `rename` requires the source and destination on the same mount. If your tmp dir is on `/tmp` (tmpfs) and your cache is on `/mnt/nfs/...`, `rename` will fall back to copy+unlink, which breaks atomicity.
- **Windows `MoveFile` is not truly atomic** in the same sense. Directory-rename-as-commit is a Unix idiom; on Windows use `MoveFileEx(MOVEFILE_REPLACE_EXISTING)` with caveats.
- **Symlinks as the "commit point" are an alternative** (e.g. `ln -sfn tmp_xxx cache`), but they have their own race windows on NFS. Rename is simpler.
