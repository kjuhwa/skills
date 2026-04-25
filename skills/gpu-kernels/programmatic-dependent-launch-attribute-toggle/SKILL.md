---
name: programmatic-dependent-launch-attribute-toggle
description: Enable CUDA Programmatic Dependent Launch (PDL) per-call via `cudaLaunchAttributeProgrammaticStreamSerialization`, allowing a downstream kernel to start before the upstream completes — exposed as a runtime-tunable flag, not a compile flag.
category: gpu-kernels
version: 1.0.0
version_origin: extracted
tags: [pdl, programmatic-dependent-launch, cuda-12, launch-attributes, kernel-overlap]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit/handle.hpp
  - csrc/jit/device_runtime.hpp
  - csrc/jit/kernel_runtime.hpp
imported_at: 2026-04-18T13:30:00Z
---

# Toggle Programmatic Dependent Launch Per Kernel Call

## When to use
CUDA 12 added Programmatic Dependent Launch (PDL): if the downstream kernel declares it's willing to start early, the driver can launch it *before* the upstream fully drains — the downstream blocks on `cudaGridDependencySynchronize()` only when it needs the upstream's data. This lets you overlap the tail of kernel A with the preamble of kernel B.

You want to:
- Enable PDL for specific launches without recompiling.
- Default it on (the kernel code already includes the dep-sync barrier), but let the user flip it off for A/B comparison or to isolate kernel timings under Nsight.

## Steps
1. **Declare the runtime flag** in your device-runtime singleton, default `false`:
   ```cpp
   class DeviceRuntime {
       bool enable_pdl = false;
   public:
       void set_pdl(const bool& new_enable_pdl) { enable_pdl = new_enable_pdl; }
       bool get_pdl() const { return enable_pdl; }
   };
   ```
2. **Expose via pybind11:**
   ```cpp
   m.def("set_pdl", [&](const bool& v) { device_runtime->set_pdl(v); });
   m.def("get_pdl", [&]() { return device_runtime->get_pdl(); });
   ```
3. **Pass through the launch-args struct** so every call-site has a single "pdl?" bool:
   ```cpp
   struct LaunchArgs {
       std::pair<int,int> grid_dim; int num_threads; int smem_size;
       int cluster_dim; bool enable_pdl;
   };
   ```
4. **Override the struct-level default with the runtime global** at launch time — this way individual kernels can set a sensible default, but the user's runtime flip wins:
   ```cpp
   LaunchArgs launch_args = args.launch_args;
   launch_args.enable_pdl = device_runtime->get_pdl();  // global override
   ```
5. **Add the PDL attribute to the launch config** alongside cluster dims. Both APIs (driver + runtime) use the same attribute struct:
   ```cpp
   if (enable_pdl) {
       auto& attr = attrs[config.numAttrs++];
       attr.id = CU_LAUNCH_ATTRIBUTE_PROGRAMMATIC_STREAM_SERIALIZATION;
       attr.val.programmaticStreamSerializationAllowed = 1;
   }
   ```
   `numAttrs` is the explicit count — don't over-allocate.
6. **The kernel still needs `cudaGridDependencySynchronize`** (or the equivalent `griddepcontrol` PTX) before it reads any upstream data. PDL without the sync is a bug: you may read garbage.

## Evidence (from DeepGEMM)
- `csrc/jit/device_runtime.hpp:15,127-133`: `enable_pdl` field, default `false`; `set_pdl`/`get_pdl` accessors.
- `csrc/jit/kernel_runtime.hpp:19,21-22,145-147`: `LaunchArgs::enable_pdl`, then the `launch_args.enable_pdl = device_runtime->get_pdl();` override on launch.
- `csrc/jit/handle.hpp:100-106,205-210`: the attribute setup — identical shape across runtime-API and driver-API builds.

## Counter / Caveats
- **PDL requires compute capability 9.0+.** Enabling on Volta/Ampere is silently a no-op (or errors depending on runtime); check `get_arch_major() >= 9`.
- **Order of attributes matters on some driver versions.** Keep PDL and cluster setup in fixed positions within the `attrs[]` array to avoid driver bugs.
- **The global flag masks per-call intent.** Some kernels might legitimately want PDL off (sharing a stream with latency-sensitive ops). Consider a per-call override that passes through: `enable_pdl_explicit ? enable_pdl_explicit : device_runtime->get_pdl()`.
- **Nsight Compute profiling flips all PDL-enabled kernels to serial** by default; don't trust PDL savings in profiled runs — measure with `bench_kineto` + no Nsight.
