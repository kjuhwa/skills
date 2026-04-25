---
version: 0.1.0-draft
name: pdl-launch-attribute-vs-cluster-size-interaction
description: `cudaLaunchAttributeClusterDimension` (for thread-block clusters) and `cudaLaunchAttributeProgrammaticStreamSerializa...
type: knowledge
category: arch
confidence: medium
source: DeepGEMM
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit/handle.hpp
  - csrc/jit/kernel_runtime.hpp
tags: [pdl, cluster, launch-attributes, cuda, kernel-launch, hopper]
imported_at: 2026-04-18T13:30:00Z
---

# PDL And Cluster Size Are Independent Launch Attributes — Combine Freely

## Fact / Decision
`cudaLaunchAttributeClusterDimension` (for thread-block clusters) and `cudaLaunchAttributeProgrammaticStreamSerialization` (for Programmatic Dependent Launch) are two independent `cudaLaunchAttribute` entries that you add to a single `cudaLaunchConfig_t`. They don't interact — you can have neither, either, or both on the same launch. DeepGEMM's abstraction puts both behind a `static LaunchAttrHandle attrs[2]` array sized to the max, with a per-call `config.numAttrs` counter.

## Why it matters
- **You want PDL by default** on any recent-arch kernel — it's free speed once the kernel-side `cudaGridDependencySynchronize()` is in place.
- **You want clustering only when the cost model says so** — clustering adds synchronization overhead that's only amortized with sufficient multicast reuse.
- Both opt-ins are per-launch, not per-kernel. A JIT that wants different behavior for different workloads just sets the flags in the `LaunchConfigHandle`.

The implementation discipline:
```cpp
static LaunchAttrHandle attrs[2];
config.numAttrs = 0;
config.attrs = attrs;

if (cluster_dim > 1) {
    auto& attr = attrs[config.numAttrs++];
    attr.id = CU_LAUNCH_ATTRIBUTE_CLUSTER_DIMENSION;
    attr.val.clusterDim = {...};
}
if (enable_pdl) {
    auto& attr = attrs[config.numAttrs++];
    attr.id = CU_LAUNCH_ATTRIBUTE_PROGRAMMATIC_STREAM_SERIALIZATION;
    attr.val.programmaticStreamSerializationAllowed = 1;
}
```
`numAttrs` is the honest count; the driver reads only that many. `static` is critical — the attribute array must outlive the launch (since `config.attrs` is a pointer).

## Evidence
- `csrc/jit/handle.hpp:87-107` (runtime API) and `csrc/jit/handle.hpp:191-210` (driver API): both APIs use the same two-slot attribute array pattern.
- `csrc/jit/kernel_runtime.hpp:14-26`: the `LaunchArgs` struct bundles `cluster_dim` and `enable_pdl` as parallel, independent fields.

## Caveats / When this doesn't apply
- **`static LaunchAttrHandle attrs[2]` means this code is not thread-safe for concurrent launches.** Two threads calling `construct_launch_config` race on the static array. DeepGEMM assumes single-threaded launch dispatch; if you want concurrency, move the array to thread-local or pass it through the caller.
- **PDL + cluster together add two attributes. If you add a third (e.g. cooperative groups), increase the array size.** Out-of-bounds write is silent and will corrupt stack/heap neighbors.
- **Some older drivers reject a non-zero `numAttrs` with a null `attrs` pointer.** Always set both or neither.
- **The attribute values have different member names between driver and runtime APIs** (`attr.val` vs `attr.value`, `clusterDim` vs `clusterDim.{x,y,z}`). This is the main reason DeepGEMM keeps separate branches — the outer pattern is identical, but field access differs.
