---
name: fatal-vs-transient-error-classifier
description: Classify workflow-execution errors as FATAL / TRANSIENT / UNKNOWN using pattern lists, with FATAL priority to prevent retrying auth failures, plus a separate detector for credit-exhaustion strings in streamed assistant output.
category: workflow
version: 1.0.0
version_origin: extracted
tags: [workflow, error-classification, retry, fatal, transient, ai-streaming]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
---

# FATAL-Priority Error Classifier + Credit-Exhaustion Streaming Detector

## When to use

- Your workflow engine retries transient failures (network, rate-limit, transient disconnect) but must **not** retry auth/authorization failures — retrying a 401 just burns quota and delays the actual problem (missing/expired token).
- Error messages from SDKs often chain pieces: `"unauthorized: process exited with code 1"`. Both "unauthorized" and "exited with code" match patterns; you need a tiebreak rule.
- Claude-style streaming SDKs sometimes return credit-exhaustion **as a regular assistant-text message** instead of throwing. You need to detect the prose and turn it into a FATAL outcome.

## Steps

1. **Define three classes**: `'FATAL' | 'TRANSIENT' | 'UNKNOWN'`. Use a string enum, not numeric — logs read better.

2. **Define two pattern lists** (lowercase-compared substrings, not regex, for speed and auditability):

   ```ts
   export const FATAL_PATTERNS = [
     'unauthorized', 'forbidden', 'invalid token', 'authentication failed',
     'permission denied', '401', '403', 'credit balance', 'auth error',
   ];

   export const TRANSIENT_PATTERNS = [
     'timeout', 'econnrefused', 'econnreset', 'etimedout',
     'rate limit', 'too many requests', '429', '503', '502',
     'network error', 'socket hang up',
     'exited with code', 'claude code crash',
   ];
   ```

3. **Classify by checking FATAL first**, TRANSIENT second, `UNKNOWN` otherwise:

   ```ts
   export function classifyError(error: Error): ErrorType {
     const message = error.message.toLowerCase();
     if (matchesPattern(message, FATAL_PATTERNS)) return 'FATAL';
     if (matchesPattern(message, TRANSIENT_PATTERNS)) return 'TRANSIENT';
     return 'UNKNOWN';
   }
   ```

   The FATAL-first priority is **load-bearing** — without it, `"unauthorized: process exited with code 1"` would be classified TRANSIENT (because "exited with code" appears in TRANSIENT_PATTERNS) and retried. Document this in the function comment.

4. **Add a separate detector for streamed assistant output** — credit exhaustion manifests as chat text:

   ```ts
   const CREDIT_EXHAUSTION_OUTPUT_PATTERNS = [
     "you're out of extra usage", 'out of credits',
     'credit balance', 'insufficient credit',
   ];

   export function detectCreditExhaustion(text: string): string | null {
     const lower = text.toLowerCase();
     if (CREDIT_EXHAUSTION_OUTPUT_PATTERNS.some(p => lower.includes(p))) {
       return 'Credit exhaustion detected — resume when credits reset';
     }
     return null;
   }
   ```

   Call this on each assistant chunk or the accumulated node output. When it returns non-null, abort the node with FATAL + the returned user-facing message.

5. **Treat `UNKNOWN` as "log + bubble up."** Don't silently retry unknown errors — surface the raw message so unexpected failure modes are visible, not papered over.

6. **Pair with a user-facing formatter** (e.g. `classifyAndFormatError` in Archon's `error-formatter.ts`) that maps fatal classes to actionable one-liners ("⚠️ Claude authentication expired. Run `/login`…").

## Counter / Caveats

- Pattern matching against message substrings is fragile. Audit the lists whenever you bump SDK versions.
- **Don't** use regex here — substring is sufficient, and simple regexes invite catastrophic backtracking on adversarial strings.
- If an error carries an explicit `code` field (`err.code === 'ENOENT'`), **prefer that** over message matching. Archon uses message patterns only where structured codes are unavailable (e.g. child-process crashes, SDK-wrapped errors).
- Credit-exhaustion text patterns are provider-specific. Audit for each SDK you support; Anthropic's wording has changed twice.
- Do not include `'error'` or `'fail'` as patterns — they match too broadly.

## Evidence

- `packages/workflows/src/executor-shared.ts:27-81`:
  - `ErrorType`, `FATAL_PATTERNS`, `TRANSIENT_PATTERNS`, `matchesPattern`, `classifyError`.
  - FATAL-first comment at lines 67-70: "FATAL patterns take priority over TRANSIENT patterns to prevent an error message containing both (e.g. 'unauthorized: process exited with code 1') from being retried."
- `packages/workflows/src/executor-shared.ts:83-106`: `CREDIT_EXHAUSTION_OUTPUT_PATTERNS` + `detectCreditExhaustion` with comment "The Claude SDK returns credit exhaustion as a normal assistant text message rather than throwing."
- `packages/core/src/utils/error-formatter.ts`: full user-facing formatter mapping classes to actionable messages (auth errors, network, database, session, etc.).
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
