---
version: 0.1.0-draft
name: interface-abstraction-for-modularity
summary: Pure-virtual C++ interfaces in a dedicated src/interfaces/ directory decouple modules without symbol-level coupling, and enable IPC code generation later.
category: arch
tags: [cpp, architecture, modularity, ipc, dependency-inversion]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/bitcoin/bitcoin
source_ref: refs/remotes/origin/master
source_commit: edcf84c73abcad31346388a4b8712b38742801ce
source_project: bitcoin
source_kind: project
imported_at: 2026-04-15
---

# Abstract-interface layer for cross-module decoupling

## The rule

Define cross-module contracts as pure-virtual C++ classes in a dedicated `src/interfaces/` directory. Callers only see the abstract class; each module implements its side locally. Modules never `#include` another module's concrete headers.

## Why

A large codebase with several top-level components (e.g. core engine, UI, wallet/state, networking) will drift into a tangle of direct includes unless you force a barrier. Once direct includes form a cycle, you lose:

- incremental build speed (one change rebuilds unrelated components),
- the option to ship a subset as a library,
- the option to move a component into a separate process later (IPC code generation needs a stable interface shape, not a tangle of concrete types).

The abstract-interface directory is the cheapest possible barrier: no build-system magic, no framework, just a convention that the compiler and code reviewers can enforce.

## How to apply

- Every cross-module call goes through a pure-virtual class declared in `interfaces/`.
- Implementation classes are private to the owning module (`impl/` folder, translation-unit-local factories returning `std::unique_ptr<Interface>`).
- When a new entry point is needed, add the method to the interface **first**, then implement. Callers' CI breaks on signature mismatches, not on missing includes from a module they didn't know existed.
- Later, a codegen tool (Cap'n Proto's `mpgen` is one example — see `multiprocess-architecture-via-ipc`) can turn each interface into an IPC proxy without changing caller code.

## Evidence

- `doc/design/multiprocess.md` (section "Component overview")
- `src/interfaces/` directory
- `doc/design/libraries.md` (section "Dependencies")
