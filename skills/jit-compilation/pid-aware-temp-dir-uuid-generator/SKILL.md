---
name: pid-aware-temp-dir-uuid-generator
description: Generate unique temporary directory names with `pid + steady_clock + mt19937(xor-seeded)` — survives fork, co-exists across multiple processes on the same filesystem, no crypto deps.
category: jit-compilation
version: 1.0.0
version_origin: extracted
tags: [uuid, temp-files, pid, random, fork-safe, filesystem]
confidence: medium
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

# PID-Aware Temp Directory UUID Generator

## When to use
Your JIT compiler creates a temp directory per compile (into which it writes `kernel.cu`, then `.cubin`, then renames to the final cache path). On a shared filesystem with dozens of training ranks, you need names that:
- Never collide between processes (same machine, same user, same millisecond).
- Are readable enough to debug (the PID tells you which process).
- Survive `fork()` — the post-fork child must not generate the same sequence as the parent.

## Steps
1. **Seed an `mt19937` once with `random_device XOR steady_clock`.** Keep it `static`:
   ```cpp
   static std::random_device rd;
   static std::mt19937 gen([]() {
       return rd() ^ std::chrono::steady_clock::now().time_since_epoch().count();
   }());
   static std::uniform_int_distribution<uint32_t> dist;
   ```
   - `random_device` provides OS-level entropy.
   - The XOR with `steady_clock` protects against platforms where `random_device` is deterministic (e.g. older MinGW).
   - Lambda initializer runs once per process.
2. **Format as `PID-XXXXXXXX-XXXXXXXX-XXXXXXXX`:**
   ```cpp
   std::stringstream ss;
   ss << getpid() << "-" << std::hex << std::setfill('0')
      << std::setw(8) << dist(gen) << "-"
      << std::setw(8) << dist(gen) << "-"
      << std::setw(8) << dist(gen);
   return ss.str();
   ```
   - Leading PID segments all temp files from the same process — easy to `grep` or batch-remove.
   - 3 × 32 = 96 random bits is plenty to avoid within-process collision even at 10⁶ temps.
3. **Use for the temp directory name, not the final cache directory.** Temp names can be ugly; cache names should be content-addressable (hex digest of the source).
4. **Pair with directory-rename atomic commit.** Once the tmp dir is fully populated and fsynced, atomically rename to the content-keyed final name. Temp names never survive.

## Evidence (from DeepGEMM)
- `csrc/utils/system.hpp:84-98`: `get_uuid()` — exactly this pattern with a single `static` seed.
- `csrc/jit/compiler.hpp:111`: use site — `make_tmp_dir() / get_uuid()`, so the final path is `~/.deep_gemm/tmp/{pid}-{rand}-{rand}-{rand}/`.

## Counter / Caveats
- **Fork inherits the `mt19937` state.** Parent and child generate the same next number on their first call. Mitigation: call `gen.seed(pid_xor_now)` in a `pthread_atfork` child handler, or always include `getpid()` in the filename so collision is impossible even if the random bits coincide.
- **`random_device` on some platforms blocks** (Linux `/dev/random`). If init is on the hot path, consider pre-seeding at module load.
- **Not cryptographic.** Attacker-controlled UUIDs can be predicted. Don't use in security-sensitive paths.
