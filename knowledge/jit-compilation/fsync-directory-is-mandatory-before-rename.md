---
version: 0.1.0-draft
name: fsync-directory-is-mandatory-before-rename
description: On NFS and POSIX filesystems, after writing files into a directory and before `rename(old_dir, new_dir)`, you must `f...
type: knowledge
category: pitfall
confidence: high
source: DeepGEMM
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit/compiler.hpp
tags: [fsync, directory, rename, nfs, posix, durability]
imported_at: 2026-04-18T13:30:00Z
---

# fsync the Directory Itself Before Renaming Into the Cache

## Fact / Decision
On NFS and POSIX filesystems, after writing files into a directory and before `rename(old_dir, new_dir)`, you must `fsync` not only every file but also the *directory inode*. Without the directory fsync:
- File contents are durable, but the directory entries that point to them may still be write-behind in the client cache.
- Another process doing `ls` or `open` on the freshly-renamed directory can see an empty directory or zero-byte children.
- A machine crash can leave the renamed path pointing at a directory whose children aren't actually there.

## Why it matters
NFS and other distributed filesystems use write-behind buffers on the client. `fsync(fd)` tells the server "flush this inode". For a regular file, the fd is the file; for a directory, you must open the directory read-only and fsync that fd.

The sequence for committing a multi-file atomic cache entry:
1. Write each file, close each ofstream.
2. For each file: `fd = open(path, O_RDONLY); fsync(fd); close(fd)`.
3. Open the directory itself: `fd = open(dir_path, O_RDONLY); fsync(fd); close(fd)`.
4. `rename(tmp_dir, final_dir)`.

DeepGEMM implements this as a bottom-up recursive walk (`fsync_dir`) so that nested subdirectories also get their inodes synced before the parent commits.

## Evidence
- `csrc/jit/compiler.hpp:70-88`: `fsync_path` and `fsync_dir`. The recursion is bottom-up (children before parent) so that by the time you fsync a directory, all its inodes are durable.
- `csrc/jit/compiler.hpp:79`: explicit comment:
  > Recursively fsync a directory: files and subdirectories first (bottom-up), then the directory itself
  > NOTES: ensures data and directory entries are visible on other nodes in distributed filesystems
- `csrc/jit/compiler.hpp:129-130`: call site — `fsync_dir(tmp_dir_path)` immediately before the rename.

## Caveats / When this doesn't apply
- **On local `ext4 / xfs` with `barrier=1`**, `fsync` on a file usually implies the directory inode is also synced — but relying on this is fragile. Be explicit.
- **Some filesystems treat `O_RDONLY fsync` as a no-op.** Test on the target filesystem — don't assume portability.
- **The cost adds up.** For a 10-kernel compile burst with 3 files each, you're doing 40 fsync syscalls. On spinning disks this is ~10-20ms each. On SSDs with `data=writeback`, it's microseconds. Budget accordingly.
- **`std::filesystem::copy` and `std::filesystem::rename`** inside the standard library do not fsync — you must do it yourself. Don't assume any C++17 helper handles durability for you.
- **If you skip the directory fsync but keep the file fsyncs**, readers may still see empty directories momentarily — classic "I wrote the files, why is the directory empty?" symptom.
