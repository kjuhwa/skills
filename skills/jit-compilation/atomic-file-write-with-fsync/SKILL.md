---
name: atomic-file-write-with-fsync
description: Wrap every cache write with a `put(path, data)` helper that calls `ofstream.write`, closes, then `fsync(open(path))` so other processes on distributed filesystems see the full file before it's read.
category: jit-compilation
version: 1.0.0
version_origin: extracted
tags: [fsync, atomic-write, nfs, distributed, posix, cache]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit/compiler.hpp
imported_at: 2026-04-18T13:30:00Z
---

# Atomic File Write With fsync Boilerplate

## When to use
Your JIT writes intermediate artifacts (`kernel.cu`, `kernel.ptx`, `kernel.cubin`) into a cache directory on a shared filesystem. After write you invoke NVCC, which spawns child processes that *read* those files back. Without `fsync`:
- On NFS, the data is still in the client's write-behind cache when NVCC starts; the child sees zero bytes.
- On local ext4, `close()` returns before the data flushes to disk; if the machine crashes 50ms later you have a cache entry that claims to exist but the file is empty.

Every file you want another process (including a child you just spawned) to read must be fsynced after close.

## Steps
1. **Implement a single `put(path, data)` helper** — never write to disk without it:
   ```cpp
   static void put(const std::filesystem::path& path, const std::string& data) {
       std::ofstream out(path, std::ios::binary);
       DG_HOST_ASSERT(out.write(data.data(), data.size()));
       out.close();  // closes the stream but may not flush

       // Reopen read-only and fsync — makes the data visible to other processes
       fsync_path(path);
   }
   ```
2. **`fsync_path` opens then fsyncs then closes:**
   ```cpp
   static void fsync_path(const std::filesystem::path& path) {
       const auto fd = ::open(path.c_str(), O_RDONLY);
       if (fd >= 0) { ::fsync(fd); ::close(fd); }
   }
   ```
   Read-only is enough — `fsync` doesn't care about mode.
3. **After writing a full directory, fsync the directory too** (recursively). The `fsync_dir` pattern walks the tree bottom-up, fsyncing files first then the containing dirs:
   ```cpp
   static void fsync_dir(const std::filesystem::path& dir_path) {
       for (const auto& entry: std::filesystem::directory_iterator(dir_path)) {
           if (entry.is_directory()) fsync_dir(entry.path());
           else if (entry.is_regular_file()) fsync_path(entry.path());
       }
       fsync_path(dir_path);  // fsync the directory entry itself
   }
   ```
   Why fsync the directory? A rename or create inside it isn't durable until the directory's inode is synced — on NFS this is what makes the `rename`-to-final-path visible to peers.
4. **Order of operations for atomic commit:**
   1. `put(tmp_dir / "kernel.cu", code)` — fsync'd inside.
   2. Run NVCC → `tmp_dir / "kernel.cubin"` appears.
   3. `fsync_dir(tmp_dir)` — now all contents are durable.
   4. `std::filesystem::rename(tmp_dir, final_dir)` — atomic on most filesystems.
5. **Never use `sync_with_stdio` tricks** — they don't guarantee fsync. `endl` doesn't fsync either. The only durable action is `fsync()` on an open fd.

## Evidence (from DeepGEMM)
- `csrc/jit/compiler.hpp:70-76`: `fsync_path` — the 5-line open+fsync+close.
- `csrc/jit/compiler.hpp:80-88`: `fsync_dir` — bottom-up recursive.
- `csrc/jit/compiler.hpp:90-98`: `put` — the mandatory helper; the comment on line 95-96 calls out why:
  > `fsync` to ensure the data is visible to other processes (e.g., NVCC) on distributed filesystems, where `close()` alone does not guarantee persistence.
- `csrc/jit/compiler.hpp:129-130`: `fsync_dir(tmp_dir_path)` is called right before the directory rename.

## Counter / Caveats
- **fsync is expensive** — on spinning disks it can take milliseconds. For a JIT that compiles 10 kernels in parallel, that's 10× the overhead. Worth it for correctness.
- **`fsync` on a directory is not universally portable.** It works on Linux and modern macOS; Windows's `FlushFileBuffers` on a directory handle is the closest equivalent but behaves differently. The DeepGEMM path is Linux-only.
- **Don't fsync every file unconditionally.** On local SSD with `data=writeback` mounts, `fsync` is a no-op for the app but still triggers disk activity. Gate on "is the target filesystem remote?" if you have many writes per second.
- **Interaction with `O_DSYNC` / `O_SYNC`:** opening write-mode with `O_SYNC` makes every write-syscall fsync'd but is 10× slower than batched-fsync-after-close. Prefer the close-then-fsync pattern.
