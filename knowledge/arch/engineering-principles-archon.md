---
version: 0.1.0-draft
name: engineering-principles-archon
summary: Six-principle engineering charter — KISS / YAGNI / DRY+Rule-of-Three / SRP+ISP / Fail-Fast / No-Autonomous-Lifecycle-Mutation / Determinism / Reversibility — applied as implementation constraints, not slogans.
category: arch
confidence: high
tags: [architecture, principles, engineering, charter]
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
---

# Archon's Engineering Principles Charter

## Fact / Decision

Archon's root `CLAUDE.md` codifies a six-principle engineering charter as **implementation constraints, not slogans**. The charter is short enough to fit on a card and specific enough to review PRs against:

1. **KISS — Keep It Simple.** Straightforward control flow over clever meta-programming. Explicit branches over hidden dynamic behavior. Obvious and localized error paths.

2. **YAGNI — You Aren't Gonna Need It.** No config keys, interface methods, feature flags, or workflow branches without a concrete accepted use case. No speculative abstractions without at least one current caller. Unsupported paths stay explicit (error out) rather than getting partial fake support.

3. **DRY + Rule of Three.** Duplicate small, local logic when it preserves clarity. Extract shared utilities **only after the same pattern appears at least three times and has stabilized**. When extracting, preserve module boundaries and avoid hidden coupling.

4. **SRP + ISP — Single Responsibility + Interface Segregation.** Each module/package focuses on one concern. Extend by implementing existing narrow interfaces (`IPlatformAdapter`, `IAgentProvider`, `IDatabase`, `IWorkflowStore`). Avoid fat interfaces and god modules. Never add unrelated methods to an existing interface — define a new one.

5. **Fail Fast + Explicit Errors.** Silent fallback in agent runtimes is unsafe or costly. Throw early with a clear error for unsupported/unsafe states. Never silently broaden permissions. Document intentional fallbacks with a comment; otherwise throw.

6. **No Autonomous Lifecycle Mutation Across Process Boundaries.** When a process can't reliably distinguish "actively running elsewhere" from "orphaned by a crash," it must not auto-mark that work failed/cancelled/abandoned. Surface the ambiguous state to the user with a one-click action.

7. **Determinism + Reproducibility.** Reproducible commands and locked dependency behavior in CI-sensitive paths. Deterministic tests, no flaky timing/network dependence. Local `bun run validate` maps directly to CI.

8. **Reversibility + Rollback-First Thinking.** Changes stay easy to revert: small scope, clear blast radius. For risky changes, define the rollback path **before** merging. No mixed mega-patches that block safe rollback.

## Why

These principles exist because Archon's domain (an AI agent runtime) amplifies the cost of every bad default:

- Silent failure costs money (API charges) and trust.
- Speculative abstraction costs comprehension (the agent has to reason about unused paths when generating code).
- Mega-patches cost revertability (you can't roll back a week of conflated changes when one of them breaks production).
- Non-determinism costs debuggability (flaky tests become "just rerun it" culture, hiding real bugs).

Having the principles written down means code review can cite a specific clause rather than debate taste.

## Counter / Caveats

- Rule of Three is **not** "don't DRY anything." Local duplication at the same file / package is fine; duplicate cross-package is a smell that deserves the third incarnation before extraction.
- YAGNI doesn't mean "don't design." It means don't codify a design until there's a caller for every branch of it.
- Fail-fast clashes with user-facing graceful degradation. Resolve it at the edge: throw at internal boundaries, translate to a user-friendly message at the outermost adapter.
- Reversibility beats DRYness beats completeness — ship a small diff that's easy to revert, even if it duplicates a concept that "should" be extracted. You can extract later.

## Evidence

- Root `CLAUDE.md` lines 50-95: full "Engineering Principles" section with each principle + its implementation-level guidance.
- The principles are referenced throughout the codebase: fail-fast shows up in `resolver.ts`, no-autonomous-lifecycle in `cleanup-service.ts`, ISP in the adapter/provider interface split, YAGNI comments in `loader.ts` ("imperative code remains in `validateDagStructure()`" is deliberate Rule-of-Three compliance).
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
