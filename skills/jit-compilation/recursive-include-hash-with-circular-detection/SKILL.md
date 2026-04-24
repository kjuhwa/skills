---
name: recursive-include-hash-with-circular-detection
description: Build a content-addressable hash over a CUDA/C++ source's entire transitive include graph so the JIT cache invalidates automatically when any header changes, detecting circular includes with a std::nullopt sentinel.
category: jit-compilation
version: 1.0.0
version_origin: extracted
tags: [jit, cache-invalidation, include-graph, hashing, cuda, circular-include]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit/include_parser.hpp
  - csrc/jit/kernel_runtime.hpp
imported_at: 2026-04-18T13:30:00Z
---

# Recursive Include Hash With Circular-Include Detection

## When to use
When your JIT compiler needs to cache `.cubin` by source content, and that source `#include`s project headers that may themselves change between runs. A raw "hash the kernel.cu text" misses header edits and causes stale cache hits. You want one deterministic hash per *transitive* include set.

## Steps
1. **Regex-scan the code** for `#include <...>` lines. Reject non-standard spacing (e.g. `#include < foo >`) early — strict form prevents false-matches in macros.
2. **Filter** to your own library's includes (e.g. `deep_gemm/*`); system headers don't need to be hashed because they track via the compiler signature.
3. **For each include path, call `get_hash_value_by_path(p)`.** Maintain a `std::unordered_map<path, std::optional<std::string>> cache`:
   - **Cache miss:** mark `cache[p] = std::nullopt` *before* recursing into this file's own includes. Read the file, recursively compute its own include-hash + body-hash, then write the resolved value back.
   - **Cache hit with value:** return the stored hash.
   - **Cache hit with `std::nullopt`:** we are already visiting this node higher in the stack — that is a circular include. Raise a clear error with the offending path.
4. **Combine child hashes** into the parent by streaming `child_hash << "$"` into a `stringstream`, then hashing that stream + the parent's own body with a second `#` delimiter to avoid prefix-collision ambiguity.
5. **Prepend the include hash to the generated source** as a comment so it is part of the cache key and also human-readable:
   ```cpp
   code = fmt::format("// Includes' hash value: {}\n{}", include_hash, code);
   ```
6. **Compute it once per kernel template** (static local), since `generate_impl`'s include set is assumed stable for a given runtime class.

## Evidence (from DeepGEMM)
- `csrc/jit/include_parser.hpp:14,56-73`: `cache` uses `std::optional<std::string>` so `std::nullopt` = "currently being resolved"; a second visit during resolution trips `DG_HOST_UNREACHABLE("Circular include may occur: ...")`.
- `csrc/jit/include_parser.hpp:47-54`: the two-stage hash — child-digests joined with `$`, then optional body joined with `#` — prevents collisions between different graphs that happen to share a leaf set.
- `csrc/jit/kernel_runtime.hpp:127-131`: `LaunchRuntime::generate` memoizes `include_hash` in a `static std::string` so the recursive parse happens only on the first kernel instantiation.

## Counter / Caveats
- **Relative includes are not parsed.** The current parser's `TODO` only handles `<deep_gemm/...>` form. If you mix relative includes, you need a path-resolver pass.
- **The regex rejects tabs between `include` and the bracket.** Be strict or loosen intentionally — loose rejection creates false-hash-match bugs later.
- **The sentinel pattern only detects cycles, not diamonds.** Diamonds (A→B, A→C, B→D, C→D) are fine and correctly cached — only genuine cycles fail.
