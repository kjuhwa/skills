---
name: safe-remove-all-for-distributed-filesystems
description: Replace `std::filesystem::remove_all` with a recursive walk that tolerates concurrent mutation on NFS/Lustre — use pre-incremented iterators, skip-permission-denied options, and error-code overloads that never throw.
category: jit-compilation
version: 1.0.0
version_origin: extracted
tags: [filesystem, nfs, distributed, concurrency, error-handling, cleanup]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/utils/system.hpp
  - csrc/jit/compiler.hpp
imported_at: 2026-04-18T13:30:00Z
---

# Safe `remove_all` For Distributed Filesystems

## When to use
You have a JIT cache on a shared NFS/Lustre filesystem, multiple ranks writing into it concurrently, and the loser of a race needs to clean up its temp directory. `std::filesystem::remove_all` doesn't cut it:
- On NFS, it can segfault when another process is simultaneously writing into a descendant directory (stale directory entries trip libstdc++).
- It throws on partial failures (`ENOENT` because a peer already cleaned; `EACCES` because another rank renamed mid-walk).
- It doesn't accept a policy like "skip permission-denied entries".

You need a recursive remove that is *best-effort*: it removes what it can, survives concurrent mutation, and never throws.

## Steps
1. **Top-level existence check via `error_code` overload.** Never throw:
   ```cpp
   std::error_code ec;
   if (not std::filesystem::exists(path, ec) or ec) return;  // gone, or peer raced
   ```
2. **Fast-path single-file case.** `remove(path, ec)` and return. No need to recurse for a plain file.
3. **For directories, iterate with `skip_permission_denied`.**
   ```cpp
   auto it = std::filesystem::directory_iterator(path,
       std::filesystem::directory_options::skip_permission_denied, ec);
   ```
   This prevents a single unreadable child from stopping the whole cleanup.
4. **Pre-increment before using the entry.** This is the load-bearing trick:
   ```cpp
   for (auto end = std::filesystem::directory_iterator(); it != end and not ec;) {
       const auto entry_path = it->path();
       it.increment(ec);       // advance first
       if (ec) break;          // iterator blew up (concurrent mutation)
       safe_remove_all(entry_path);  // recurse — safe even if the dir vanishes mid-walk
   }
   ```
   If you don't pre-increment, calling `safe_remove_all` on `it->path()` and then `++it` can crash because the iterator is now pointing at a deleted inode.
5. **Remove the now-empty directory.** `remove(path, ec)` — again, error-code overload. If it's already empty, this succeeds; if a peer recreated files, leave them.
6. **No retries.** A best-effort cleanup that silently fails is better than a loop that races with the peer that actually owns the directory now.

## Evidence (from DeepGEMM)
- `csrc/utils/system.hpp:100-126`: full `safe_remove_all` — pre-incremented iterator, `skip_permission_denied`, all paths use `error_code` overloads.
- `csrc/jit/compiler.hpp:137-143`: the use site — after a failed directory rename (peer beat us), clean up our tmp dir:
  ```cpp
  // NOTES: avoid `std::filesystem::remove_all` here — it can segfault on
  // distributed filesystems, when concurrent processes operate
  // on the same parent directory
  safe_remove_all(tmp_dir_path);
  ```
  The comment explicitly documents the segfault this pattern avoids.

## Counter / Caveats
- **`skip_permission_denied` in `directory_options`** was added in a later libstdc++ — check your toolchain if you see `no type named 'directory_options'`.
- **Not atomic.** If another process is *creating* files while you're deleting, you'll leave some behind. Accept this — the contract is "best effort", not "definitely empty after".
- **This is for trustworthy shared filesystems.** On a user-writable path, a symlink-race attack could delete outside the directory. DeepGEMM's path is inside the user's own `~/.deep_gemm/tmp/`, so this is not an issue — but worth noting for general use.
