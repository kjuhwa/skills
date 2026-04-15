# Ship verified code with an explicit threat boundary

A formally-verified core doesn't make the whole system safe. The verification guarantees exactly what the specification covers; bugs migrate to untrusted parsers, the language runtime, and integer-overflow edges in the trusted computing base (TCB).

## When to use

- You or your team is about to claim "proven correct" in a README, paper, or security audit.
- You're reviewing a formally-verified library before adopting it.
- You're wiring a verified core into a larger product that also consumes untrusted input.

## Steps

1. **List the verified surface.** Enumerate every theorem and what it proves. Example: `decompress(compress(x)) = x`. Write this as a short "verified surface" section in the repo README.
2. **List the unverified surface.** Anything that reads bytes from the network, filesystem, or user — parsers, archive-header readers, length-prefixed decoders. Every one of them is outside the proof.
3. **List the TCB.** Language runtime (`lean_alloc_sarray`, GC, primitive allocators), FFI shims, C++ helpers, compiler itself. Assume bugs here until audited.
4. **Fuzz the unverified surface.** Run libFuzzer / AFL on parsers and header readers with a deterministic corpus; the verified core won't crash — the unverified input path will.
5. **Guard integer arithmetic crossing the FFI boundary.** Size/length values from untrusted input that get multiplied by `sizeof(T)` are a classic overflow path — check against a sane upper bound before allocation.
6. **Document known assumptions.** `compressedSize` from a ZIP header is attacker-controlled; call it out next to the allocation site.
7. **Threat-model each verified theorem.** Ask: "does this theorem still hold if inputs are adversarial?" — spec usually assumes well-formed inputs.

## Success criteria

- A reviewer can point at a specific line and say "this is inside / outside the proof" in under 10 seconds.
- Fuzzing on the unverified surface produces zero crashes after N million executions (pick N; 100M+ is evidence).
- TCB functions that do unchecked arithmetic on untrusted lengths have a regression test for `SIZE_MAX`-class inputs.

## Gotchas

- Theorems about "inverse of compress" say nothing about malicious compressed inputs with pathological dictionaries, exabyte-sized headers, or malformed CRCs.
- The trusted runtime is usually implicit; contributors assume it's "part of the language" and skip auditing it.
- Verification culture can bias toward proving what's already well-structured and away from the dirty parsing code that actually gets attacked.
- "Zero bugs in CompCert's verified passes, all bugs in its unverified front-end" is the canonical cautionary tale.

## Canonical cautionary cases

- **CompCert**: verified C compiler; Csmith fuzzing found zero bugs in the verified middle/back end, but multiple bugs in the unverified front end.
- **lean-zip (2026)**: proved `decompress(compress(x)) = x` over the DEFLATE pipeline plus Huffman and CRC32. Fuzzing still found:
  1. Heap buffer overflow in Lean runtime's `lean_alloc_sarray` — integer overflow when requesting `SIZE_MAX` bytes allocated only ~23 bytes, with later writes clobbering the heap. Affects *all* Lean 4 programs.
  2. DoS in the archive parser — the ZIP header's `compressedSize` field was piped to allocation without bounds, crashing on exabyte-claim inputs.

## Linked knowledge

- `knowledge/pitfall/lean-verification-spec-coverage-gap.md`

## Source

- https://kirancodes.me/posts/log-who-watches-the-watchers.html — "Who Watches The Watchers" (2026).
- Research lane: skills_research trend survey, 2026-04-16 window.
