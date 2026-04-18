---
version: 0.1.0-draft
name: multiprocess-architecture-via-ipc
summary: Decompose a monolith into cooperating processes by defining interfaces in a neutral schema language (Cap'n Proto), then codegen client/server proxies that preserve the original C++ interface shape.
category: arch
tags: [ipc, capnp, architecture, process-isolation, codegen]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/bitcoin/bitcoin
source_ref: refs/remotes/origin/master
source_commit: edcf84c73abcad31346388a4b8712b38742801ce
source_project: bitcoin
source_kind: project
imported_at: 2026-04-15
---

# Process isolation through interface codegen

## The pattern

1. Define each cross-component interface as a pure-virtual C++ class in `interfaces/` (see `interface-abstraction-for-modularity`).
2. Define a corresponding `.capnp` schema that mirrors the interface shape.
3. Run a codegen tool (`mpgen` in this codebase, built on libmultiprocess / Cap'n Proto) to produce proxy client + proxy server classes that marshal calls over a UNIX domain socket.
4. High-level code keeps calling the same abstract interface — it cannot tell whether the implementation is in-process or behind a socket.

## Why Cap'n Proto specifically

The choice wasn't arbitrary. Simpler RPC frameworks (gRPC, msgpack-rpc) can't carry **object references** across the wire or express **bidirectional callbacks** naturally. Both are required to express interactive interfaces like "subscribe, with callback on events" or "return a handle that the caller can keep calling into." Cap'n Proto's capability model encodes both in the schema itself.

## What it buys

- **Security boundary.** One component (e.g. UI, wallet) can be restricted — sandboxed, memory-limited, dropped privileges — without the core engine changing.
- **Independent upgrade cadence.** Each process can be restarted without the others.
- **Language flexibility.** A future component in a different language only needs to consume the `.capnp` schema.

## What it costs

- The schema must stay in sync with the interface; codegen makes mismatches a build error, but it's still work.
- IPC adds latency — keep chatty loops on one side, design interfaces around coarse operations.
- Debugging crosses a process boundary; good logging on both sides is not optional.

## How to apply

- Start with the interface split (always useful); add the `.capnp` codegen only when process isolation is actually justified (security, scale, language).
- If you're not sure you need multi-process yet, keep the interfaces and defer the IPC step — that's the cheap, reversible half.

## Evidence

- `doc/design/multiprocess.md`
- `src/interfaces/`
- `src/ipc/capnp/`
- `src/ipc/libmultiprocess/`
