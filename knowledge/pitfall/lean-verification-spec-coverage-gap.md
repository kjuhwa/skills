---
name: lean-verification-spec-coverage-gap
category: pitfall
summary: Formal proofs cover exactly what the spec formalizes — untrusted parsers and the language runtime, which are usually *not* in the spec, routinely contain the bugs a "proven correct" library claims to have eliminated.
source:
  kind: web-research
  ref: skills_research:trend:2026-04-16
linked_skills: [lean-verified-code-threat-boundary]
---

# Formal verification only covers what the spec formalizes

**Fact.** Fuzzing a Lean 4 DEFLATE library (`lean-zip`) whose core decompression was proved correct — `decompress(compress(x)) = x` — still found two critical bugs: (1) a heap buffer overflow in the Lean runtime's `lean_alloc_sarray` (integer overflow in allocation math caused `SIZE_MAX`-byte requests to allocate ~23 bytes, with later writes overflowing; affects every Lean 4 program); (2) a DoS in the ZIP archive parser that piped attacker-controlled `compressedSize` to allocation without bounds. The proofs were valid. The bugs lived outside the verified surface — the untrusted parser and the C++ runtime supporting every Lean program.

**Why.** Verification certifies that a specification holds. Two things are almost always *not* in the specification: (a) untrusted-input handling — parsers of ZIP/PE/ELF/TLS handshakes are the highest-value attack surface and the hardest to formalize; (b) the trusted computing base — compilers, runtimes, FFI glue, primitive allocators. Every theorem implicitly trusts these. CompCert's precedent is identical: Csmith found zero bugs in the verified passes, multiple bugs in the unverified C front end.

**How to apply.** When adopting a "formally verified" library, ask for its *verified surface* (what theorems), its *unverified surface* (what parsers/readers), and its *TCB* (what runtime/compiler). Demand fuzzing results for the unverified surface before treating the library as hardened. When shipping verified code, publish the same three lists in the README — "formally verified" without that decomposition is marketing, not a security property.

**Counter / caveats.** Verification isn't worthless — on the verified surface, `lean-zip` posted 105M crash-free fuzz runs. Some projects *do* formalize parsers (HACL*, some TLS stacks); check whether your library does.

## Sources

- https://kirancodes.me/posts/log-who-watches-the-watchers.html — "Who Watches The Watchers" (2026). Single detailed case study; medium confidence pending independent corroboration.
