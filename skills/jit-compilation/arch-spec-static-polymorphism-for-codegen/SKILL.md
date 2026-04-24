---
name: arch-spec-static-polymorphism-for-codegen
description: Use a templated `get_best_config<ArchSpec>(desc)` where each architecture (SM90, SM100, etc.) is a plain struct full of `static` methods, so the compiler inlines the arch-specific heuristic with zero virtual-call overhead.
category: jit-compilation
version: 1.0.0
version_origin: extracted
tags: [static-polymorphism, templates, code-generation, architecture-dispatch, cuda]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit_kernels/heuristics/common.hpp
  - csrc/jit_kernels/heuristics/sm90.hpp
  - csrc/jit_kernels/heuristics/sm100.hpp
imported_at: 2026-04-18T13:30:00Z
---

# ArchSpec Static Polymorphism For Heuristic Dispatch

## When to use
You're maintaining a heuristic engine that picks GEMM configs for more than one GPU architecture (Hopper vs Blackwell vs future SMs). You want:
- A single orchestrator function (`get_best_config`) that's written once.
- Zero runtime vtable cost on the hot path.
- The ability to add a new arch by adding a file, not touching the orchestrator.

An abstract base class with virtuals costs a dispatch per call and tangles arch-specific constants into a base that doesn't actually share them. This skill inverts that: write each arch as an independent `struct` of static methods, then make the orchestrator a template.

## Steps
1. **Declare the arch struct in its own header** with only static methods and `static constexpr` members:
   ```cpp
   struct SM90ArchSpec {
       static constexpr int smem_capacity = 232448;
       static std::vector<Layout> get_layout_candidates(const GemmDesc&);
       static StorageConfig       get_storage_config(const GemmDesc&, const Layout&);
       static PipelineConfig      get_pipeline_config(const GemmDesc&, const Layout&, const StorageConfig&);
       static LaunchConfig        get_launch_config(const GemmDesc&, const Layout&);
       static LayoutInfo          get_layout_info(const GemmDesc&, const Layout&);
       static bool                compare(const LayoutInfo&, const LayoutInfo&);
   };
   ```
2. **Orchestrator is a free template function:**
   ```cpp
   template <typename ArchSpec>
   GemmConfig get_best_config(const GemmDesc& desc) {
       const auto cands = ArchSpec::get_layout_candidates(desc);
       auto best = cands[0];
       for (size_t i = 1; i < cands.size(); ++i)
           if (ArchSpec::compare(...)) best = cands[i];
       // infer storage/pipeline/launch configs
   }
   ```
3. **Dispatch at the API boundary**, not inside the loop:
   ```cpp
   return arch_major == 9  ? get_best_config<SM90ArchSpec>(desc)
        : arch_major == 10 ? get_best_config<SM100ArchSpec>(desc)
        : /* throw */;
   ```
4. **Comparators can be arch-specific.** SM90 uses a cycle-model comparator (`num_cycles` low is best). SM100 uses lexicographic comparisons on wave count / cluster size / block dims. Both honor the same `bool compare(a, b)` contract without sharing implementation.
5. **Shared struct definitions live in `config.hpp`** — `GemmDesc`, `Layout`, `LayoutInfo`, etc. — so every arch agrees on the data types but not the scoring.
6. **No virtual methods, no inheritance**, no `dynamic_cast`. Each arch's constants (`smem_capacity`, MMA shapes, TMEM limits) are `static constexpr` visible at the callsite — the compiler can fold them into constants.

## Evidence (from DeepGEMM)
- `csrc/jit_kernels/heuristics/common.hpp:13-52`: the `get_best_config<ArchSpec>` template orchestrator.
- `csrc/jit_kernels/heuristics/sm90.hpp:13-244`: `SM90ArchSpec` with cycle-model comparator using modeled L1/L2 bandwidth.
- `csrc/jit_kernels/heuristics/sm100.hpp:14-267`: `SM100ArchSpec` with lexicographic comparator on wave count / cluster / block dims.

## Counter / Caveats
- **Not suitable when you need a runtime-configurable third arch** — the dispatch must be known at compile time. If you need a plugin, add a virtual base and accept the indirection cost.
- **Each arch method can diverge wildly.** SM90 `compare` is one line (`num_cycles < num_cycles`). SM100 `compare` is 25 lines of lexicographic fallbacks. The contract is "returns bool, same semantics", not "same implementation shape" — don't try to force uniformity.
- **Adding a new arch requires touching the API-level dispatch.** This is the intentional tradeoff for zero-overhead dispatch.
