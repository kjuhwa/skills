---
name: completion-signal-detector
description: Detect AI "I'm done" signals in loop prompts using `<promise>SIGNAL</promise>` tags as primary, with a restrictive end-of-output / own-line plain match as legacy fallback.
category: workflow
version: 1.0.0
version_origin: extracted
tags: [workflow, loop, completion, signal, regex]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
---

# AI Completion Signal Detector (`<promise>` Tag + Restrictive Plain Fallback)

## When to use

- You run an AI inside a `loop:` node that continues until the model emits a "done" signal. The model's output is free-form prose, so you need a robust way to distinguish "the model thinks it's finished" from "the model said the word 'COMPLETE' in passing."
- Naive `output.includes('COMPLETE')` false-positives constantly (the model says "not COMPLETE yet", "ABORT if COMPLETE fails", "the COMPLETE signal means…").
- You want a primary format that is **impossible to confuse with prose** and a fallback that handles models which forget the tag.

## Steps

1. **Define the primary format as XML-like tags**: `<promise>COMPLETE</promise>`. Tell the model in the system prompt: "When finished, emit `<promise>COMPLETE</promise>` on its own."
   Tags win over plain signals because they are visually distinct in prose, easy for regex, and rarely appear by accident.
2. **Detect with a case-insensitive regex** that tolerates whitespace around the signal:
   ```ts
   new RegExp(`<promise>\\s*${escapeRegExp(signal)}\\s*</promise>`, 'i')
   ```
3. **Add a restrictive plain-signal fallback** only for legacy prompts that haven't been updated. Two patterns, OR-ed:
   - **End-of-output:** the signal is the last non-whitespace token, optionally followed by punctuation:
     ```ts
     new RegExp(`${escapeRegExp(signal)}[\\s.,;:!?]*$`)
     ```
   - **Own line:** the signal occupies its own line (no other content on that line):
     ```ts
     new RegExp(`^\\s*${escapeRegExp(signal)}\\s*$`, 'm')
     ```
4. **Always `escapeRegExp(signal)` first** — users may configure signals with regex metacharacters.
5. **Strip tags before sending output to the user.** Archon has `stripCompletionTags(content)` which removes `<promise>[\s\S]*?</promise>` so the user never sees the internal signal.
6. **Pair signal detection with an optional deterministic check** (`until_bash:` in Archon) — a shell command whose exit-0 also means "done." The loop exits when **either** the signal **or** the bash check fires. This gives you a deterministic escape hatch when the AI is unreliable.
7. **Never treat `<promise>` substring match alone as enough.** A model saying "I promise to continue" should not match. The closing tag is required.

## Counter / Caveats

- Pick a **distinctive** signal string. Archon uses `TASK_COMPLETE`, `LOOP_DONE`, etc. — all-caps, compound, unlikely in prose.
- **Don't** loosen the plain fallback to "anywhere in output." That's exactly the false-positive class the tag format exists to avoid. Archon's plain rule is deliberately strict.
- For interactive approval loops (human-in-the-loop), gate the signal additionally on "did the user actually provide input this iteration?" — the AI shouldn't self-approve on iteration zero. Archon does this via `interactiveFirstRun = loop.interactive && !isLoopResume`.
- Case-insensitive matches **only for the tags**, not the signal body. `<Promise>COMPLETE</Promise>` should match; `<promise>complete</promise>` should not (unless your signal is itself lowercase).

## Evidence

- `packages/workflows/src/executor-shared.ts:362-400`: full `detectCompletionSignal` + `stripCompletionTags` + `escapeRegExp`.
- Primary pattern at `executor-shared.ts:384`: `<promise>\\s*${signal}\\s*</promise>` (case-insensitive).
- Plain fallback patterns at `executor-shared.ts:392-393`: end-of-output + own-line.
- Used in `packages/workflows/src/dag-executor.ts:1750` to decide loop-node completion, OR-combined with `until_bash` at :1786.
- Interactive-first-run gate at `dag-executor.ts:1817-1818`.
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
