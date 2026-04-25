---
name: fnv1a-splitmix-hex-digest-for-cache-keys
description: Build a 128-bit deterministic hex digest for JIT cache keys using two FNV-1a streams with different seeds, finalized with split-mix64 — 40 lines, header-only, no crypto dependency.
category: jit-compilation
version: 1.0.0
version_origin: extracted
tags: [hashing, cache-key, fnv1a, splitmix, deterministic, header-only]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/utils/hash.hpp
imported_at: 2026-04-18T13:30:00Z
---

# FNV-1a + SplitMix64 Hex Digest For JIT Cache Keys

## When to use
Your JIT needs a deterministic, cross-platform, "collision rare enough for a local cache" digest over strings (kernel source, signature, flags). You don't want OpenSSL or `xxhash` as a dependency, and you don't need cryptographic strength. A 32-char hex digest (128 bits) is short enough to be a filesystem directory name and wide enough that birthday collisions on a per-user cache are astronomically small.

## Steps
1. **Implement FNV-1a in ~10 lines:** initial `h = seed`, loop `h ^= byte; h *= 0x100000001b3ull`.
2. **Run it twice with two different seeds** — DeepGEMM uses `0xc6a4a7935bd1e995ull` (Murmur) and `0x9e3779b97f4a7c15ull` (golden ratio). Two independent FNV-1a streams act like a double-hashing scheme and cut collision probability roughly in half per bit.
3. **Finalize each 64-bit state with SplitMix64** (the avalanche mixer from `xoshiro`):
   ```cpp
   z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9ull;
   z = (z ^ (z >> 27)) * 0x94d049bb133111ebull;
   return z ^ (z >> 31);
   ```
   This fixes FNV-1a's weak high-bit diffusion on short inputs.
4. **Emit as a fixed 32-char hex string** via `std::ostringstream << std::hex << std::setw(16)`. Fixed width matters — your cache directory naming scheme depends on it.
5. **Offer a `vector<char>` overload and a `string` overload** so callers can hash binary buffers (`.cubin`) or source strings without adaptors.
6. **Use as the cache-dir name:** `get_hex_digest(name + "$$" + signature + "$$" + flags + "$$" + code)`.

## Evidence (from DeepGEMM)
- `csrc/utils/hash.hpp:7-15`: FNV-1a in 8 lines.
- `csrc/utils/hash.hpp:17-33`: two passes with distinct seeds, SplitMix64 finalize, `std::setw(16)` per 64-bit half — 32 hex chars total.
- `csrc/jit/compiler.hpp:101-102`: use site — `kernel.{name}.{hex_digest}` as the final cache directory name.

## Counter / Caveats
- **Not cryptographic.** Do not use to authenticate or protect untrusted inputs. The seeds are public; collisions can be forged.
- **128 bits is plenty for a single-user cache** (~10^18 birthday collision floor), but a shared fleet-wide cache with 10^15 entries has real collision risk. Use BLAKE3 in that regime.
- **Heavy templating inputs (e.g. FP4/FP8 dtype strings) differ only in short substrings** — one FNV-1a pass alone would cluster; the two-seed trick genuinely helps here.
