---
version: 0.1.0-draft
name: fail-fast-explicit-errors-ai-runtime
summary: In an AI-agent runtime, silent fallback and swallowed errors are extra-dangerous — they can broaden permissions, retry forever, or charge the user without warning. Prefer throwing early with a clear message.
category: arch
confidence: high
tags: [architecture, fail-fast, ai-runtime, error-handling, safety]
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
---

# Fail-Fast + Explicit Errors Are Non-Negotiable in AI Agent Runtimes

## Fact / Decision

Silent fallback that is "harmless" in a normal web service can be catastrophic inside an AI agent runtime:

- A permission check that silently broadens scope gives the agent (or a compromised prompt) more capability than intended — destructive file operations, unintended external API calls.
- A retry loop that silently eats "out of credits" errors runs forever, burns through backup credits on a fallback provider, or just hangs until the user notices.
- A fallback from "intended model" to "any model" changes cost and quality profile without user signal.
- A DB update that silently succeeds when the row doesn't exist creates ghost state that later operations compound.

The rule: **prefer throwing early with a clear error** for unsupported or unsafe states. Never silently swallow errors. Never silently broaden permissions or capabilities. Document fallback behavior explicitly with a comment when a fallback is intentional and safe; otherwise throw.

## Why

Traditional web services fail closed: if something's broken, the request 500s and the user retries. AI agents fail **open**: a silent mishandling becomes an extra tool call, an extra API charge, an incorrect code edit. The feedback loop is slow (the user sees the result only after the agent has done something), so loud failure at boundaries is the only way to keep blast radius small.

Concretely in Archon this shows up as:

- `isolation_creation_failed` propagates to the user as a blocked message with actionable guidance, not a silent "worktree didn't happen, running in main checkout" fallback.
- Worktree ownership mismatches **throw**, stopping iteration, rather than silently skipping.
- The error classifier's FATAL priority prevents retrying auth failures — loudly surfacing the auth problem is what the user needs.
- `provider.create()` success followed by `store.create()` failure **re-throws the original store error**, cleaning up the worktree best-effort but never hiding the real failure.
- Unknown errors propagate as crashes rather than become silent "blocked" messages: the resolver comment says "Unknown errors (programming bugs, unexpected failures) should propagate so they appear in logs as crashes, not as silent 'workspace blocked' messages."

## Counter / Caveats

- Fail-fast does **not** mean "kill the process on first problem." It means surface the problem clearly — log + user-visible message + refuse to continue with ambiguous state.
- Intentional fallbacks are fine. Document each one with a comment explaining why it's safe. Archon's git `isBranchMerged` explicitly returns `false` for "repo not found" because that's a meaningful, expected state for a new clone.
- Retries are fine for explicitly *transient* classes (network, rate-limit). The FATAL/TRANSIENT classifier exists precisely to separate them.
- User-facing error messages must be actionable. "Something went wrong" is a failure mode. "Run `/login` inside Claude Code or `claude logout && claude login`" is a success mode.

## Evidence

- Root `CLAUDE.md` lines 75-79 — "Fail Fast + Explicit Errors — Silent fallback in agent runtimes can create unsafe or costly behavior" codified as an Engineering Principle.
- `packages/isolation/src/resolver.ts:113-143` — canonical-path resolution that re-throws unknown errors but converts *known* infra failures to blocked-with-actionable-message.
- `packages/isolation/src/resolver.ts:470-496` — same pattern in `createNewEnvironment`.
- `packages/workflows/src/executor-shared.ts:66-80` — FATAL-priority error classifier.
- `packages/core/src/utils/error-formatter.ts` — full mapping of error classes to actionable one-liners.
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
