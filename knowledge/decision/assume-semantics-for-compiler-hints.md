---
name: assume-semantics-for-compiler-hints
summary: Three-tier assertion strategy (Assert / CHECK_NONFATAL / Assume) separates fatal invariants from recoverable logic bugs and pure compiler hints.
category: decision
tags: [cpp, assertions, invariants, design]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/bitcoin/bitcoin
source_ref: refs/remotes/origin/master
source_commit: edcf84c73abcad31346388a4b8712b38742801ce
source_project: bitcoin
source_kind: project
imported_at: 2026-04-15
---

# Assume() vs Assert() vs CHECK_NONFATAL — a three-tier assertion strategy

## The rule

Split assertion-shaped constructs into three distinct macros, each with different runtime semantics:

| Macro | Release build | Debug/fuzz build | Use for |
|---|---|---|---|
| `Assert(x)` | abort on false | abort on false | Security-critical invariants — violating them means memory safety is gone. |
| `CHECK_NONFATAL(x)` | throws `NonFatalCheckError` | throws | Recoverable logic bugs — the caller can roll back the current operation. |
| `Assume(x)` | no-op, `__builtin_assume(x)` hint | abort on false | Preconditions the compiler can use to optimize; violating them in tests is a bug, but production can continue. |

## Why

A single `assert`-shaped macro forces every invariant to share the same runtime cost and failure mode. Consensus-critical code can't afford the branch overhead of debug asserts in the hot path, but also can't silently continue when a real contract is violated. The three-tier split lets each invariant declare its own failure semantics:

- `Assert` is for things that *must* kill the process (signature check, double-spend guard).
- `CHECK_NONFATAL` is for things that should abort the current RPC call but not the node.
- `Assume` documents a precondition to the compiler and to the reader, enabling dead-code elimination and inlining, without paying a runtime check in Release.

The wrong choice is expensive in both directions — `assert` in the hot path is slow; `assume` on a real security check is a silent compromise.

## How to apply

- When you write a new invariant, ask: "If this were false in production, what's the correct behavior — die, throw, or trust the compiler?" Answer picks the macro.
- Never promote `Assume` to `Assert` without revisiting the hot path — the cost model changes.
- In fuzz harnesses, compile with `Assume → Assert` so the fuzzer surfaces violations.

## Evidence

- `doc/developer-notes.md` (section "Assertions and checks")
- `src/util/check.h`
