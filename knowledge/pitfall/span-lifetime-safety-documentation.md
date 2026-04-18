---
version: 0.1.0-draft
name: span-lifetime-safety-documentation
summary: std::span is a non-owning view — common C++20 hazards (dangling temporaries, vector realloc, implicit construction from rvalues) and the safe usage patterns that avoid UB.
category: pitfall
tags: [cpp20, span, lifetime, ub, undefined-behavior]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/bitcoin/bitcoin
source_ref: refs/remotes/origin/master
source_commit: edcf84c73abcad31346388a4b8712b38742801ce
source_project: bitcoin
source_kind: project
imported_at: 2026-04-15
---

# std::span lifetime hazards

## The fact

`std::span<T>` (and equivalent view types) is a `{pointer, size}` pair — it owns nothing. Every guarantee you had with `vector` or `string` (stable storage, lifetime tied to the object) is gone. Violating span's implicit lifetime contract is silent undefined behavior; the compiler rarely warns.

## The hazards

1. **Dangling temporary.** `auto s = std::span<int>(make_vector());` — the vector dies at the end of the full expression, `s` points at freed memory.
2. **Reallocation.** A span built from `vec` is invalidated by any `vec.push_back` that triggers a realloc. Same for `std::string::reserve`, `deque` insertions, etc.
3. **Implicit construction from rvalue range.** Many range-like types auto-convert to span; passing a temporary to a function that stores the span is a trap.
4. **`const T` vs `T`.** `span<const T>` and `span<T>` are distinct types; overload sets and template deduction can bind to the wrong one if the API isn't explicit.

## Safe patterns

- **Pass spans by value, never store them.** Function parameter + immediate use is the only fully safe pattern.
- If you must keep a view, document the lifetime requirement in the function signature and enforce via a wrapper that captures the owner (e.g. by shared_ptr).
- Prefer `span<const T>` at API boundaries; force callers to be explicit when they need to mutate.
- Never construct a span from an rvalue-producing expression — build a named owner first.

## How to apply

Review any new API that takes or returns `span` with these four hazards in mind. If the answer to "who owns the storage, and does it outlive the span?" isn't one sentence, redesign the API.

## Evidence

- `src/span.h` (header comment and usage notes)
