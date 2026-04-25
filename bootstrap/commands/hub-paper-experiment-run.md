---
description: Guided flow to close a planned paper experiment — record result, set supports_premise, suggest outcomes, transition status to implemented (or retracted).
argument-hint: <paper-slug> [<experiment-name>] [--retract]
---

# /hub-paper-experiment-run $ARGUMENTS

The paper layer's whole point is closing the loop: a `type: hypothesis` paper transitions `draft → implemented` only when at least one `experiments[]` entry completes with a non-null `result` and `supports_premise`. Writing the paper is easy; running the experiment and updating the frontmatter consistently is where most papers stall.

This command is the guided flow for that step. It walks you from "I have a result" to a verified, lint-passing PAPER.md update — including premise rewriting if the experiment partially refutes the original claim, and `outcomes[]` suggestion if the experiment produced new corpus entries.

## Resolution

- `<paper-slug>` — locate first match in `./.paper-draft/**/<slug>/PAPER.md`, then `~/.claude/skills-hub/remote/paper/**/<slug>/PAPER.md`.
- `<experiment-name>` (optional) — `experiments[].name` to close. If omitted, list `status: planned` / `status: running` experiments and ask the user to pick one.
- `--retract` — fast path: skip experiment-result collection, jump directly to retraction (asks `retraction_reason`).

## Steps

1. **Open + parse the PAPER.md frontmatter.**
   - Validate `type: hypothesis` (other types don't need an experiment to reach `implemented`; warn and ask whether to proceed anyway).
   - Find the target experiment. Refuse if `status: completed` or `status: abandoned` already (use `--force` to overwrite).

2. **Collect result fields** (interactive, one prompt each):

   | Field | Prompt |
   |---|---|
   | `result` | "What did the experiment observe? Multi-line OK; cite numbers, deltas, conditions." (required) |
   | `supports_premise` | "Does the result support the paper's `premise.then`? `yes` / `no` / `partial`" (required) |
   | `observed_at` | "When was it observed? ISO date (YYYY-MM-DD). Default = today." |
   | `built_as` | "Was a build shipped under `example/`? Path like `example/<slug>` or `null`." (optional) |

   Validate `built_as` resolves on disk if given (must point to `example/<slug>/`).

3. **Branch on `supports_premise`:**

   ### `yes`
   - Show the existing `premise.then` with no edit prompt.
   - Skip premise rewrite step.
   - Suggest `status: implemented` transition.

   ### `partial`
   - Show the existing `premise.then`.
   - Ask: "What refined claim does the result support? Rewrite `premise.then` to capture it." Multi-line input.
   - Show side-by-side diff of old vs new `premise.then`. Confirm before applying.
   - Suggest `status: implemented` transition with the rewritten premise.

   ### `no`
   - Refusal path. Two options:
     1. Rewrite `premise.then` to capture what the result *did* show (often "the original claim was wrong because…"), then suggest `status: implemented`.
     2. Move to `status: retracted` — ask `retraction_reason` (single line) and skip premise rewrite.
   - User picks. If retracting, jump to step 6.

4. **Suggest `outcomes[]`** (optional, applies to `yes` and `partial`):
   - Ask: "Did this experiment produce a new corpus entry? Pick one or skip."
     - `produced_skill <ref>`
     - `produced_knowledge <ref>`
     - `produced_technique <ref>`
     - `produced_pitfall <ref>` (knowledge of kind=pitfall)
     - `produced_example <ref>`
     - `updated_skill / updated_knowledge / updated_technique <ref>`
     - skip
   - For each picked, validate the ref resolves on disk. Append to `outcomes[]`.
   - Loop until user types `done`.

5. **Compute new `status`** (advisory, user confirms):
   - From `draft` / `reviewed` + `supports_premise: yes | partial` → suggest `implemented`.
   - From `supports_premise: no` + retract path → `retracted`.
   - From `supports_premise: no` + premise-rewrite path → suggest `implemented` (the rewritten claim is now what's implemented).
   - Show: `status: <old> → <new>`. Confirm.

6. **Write changes.**
   - Update the experiment entry in-place: `status`, `result`, `supports_premise`, `observed_at`, `built_as` if any.
   - Append to `outcomes[]` if any were chosen.
   - Update top-level `status` and (if `retracted`) `retraction_reason`.
   - If premise was rewritten: update `premise.then` and append a note to the body's `## Provenance` section: `Premise rewritten <date> after experiment <name> result.`
   - Diff is shown before write; user confirms once.

7. **Verify.**
   - Run `/hub-paper-verify <slug>`.
   - On FAIL: print errors and offer to revert the just-written change, edit the file, or accept the FAIL state.
   - On PASS: print location and next-step hint:
     ```
     EXPERIMENT CLOSED: paper/<category>/<slug>/PAPER.md
     status: <new>
     experiment: <name> → completed
     supports_premise: <yes|partial|no>
     <if outcomes:> outcomes added: <list>

     Next: review the body, then commit + open PR via /hub-publish --only paper --pr
     ```

## Rules

- Never overwrite a `completed` experiment without `--force`. The history of a closed loop matters; rewriting silently is a footgun.
- Never auto-rewrite `premise.then` — always show diff and require explicit confirm. Premise drift without acknowledgment is the failure mode this layer exists to prevent.
- Refuse on `type: survey` or `type: position` — those don't need experiments. Print: "this paper has type=`<type>`; experiments are not required for `status: implemented`. Use a manual edit if you want to record observations anyway."
- `--retract` skips steps 2-5 entirely. Step 6 writes only `status: retracted` + `retraction_reason`.
- Authoring and verification stay separate passes (step 7 is a separate verify call). Do not collapse — the user should see the diff before lint runs.

## Example

```
/hub-paper-experiment-run parallel-dispatch-breakeven-point coordinator-curve

▶ paper/workflow/parallel-dispatch-breakeven-point (type=hypothesis, status=draft)
▶ experiment: coordinator-curve (status=planned)

result?
> Wall-clock improved 38% N=4, plateaued N=6, regressed 12% N=8 vs N=1 baseline.
  Coverage threshold matters less than task-class — annotate-files broke at N=8,
  semantic-search held to N=12.

supports_premise? (yes / no / partial)
> partial

observed_at? [default: 2026-04-25]
> 

built_as? (path under example/ or null)
> example/coordinator-overhead-benchmark

[partial] rewrite premise.then?
old: Coordinator overhead grows with N while parallelism gain saturates past N=4. …
new: > Coordinator overhead grows with N while parallelism gain saturates past N=4 for
       I/O-heavy tasks. The break-even N varies by task class (annotate-files inverts at
       N=8, semantic-search at N≥12), so a single threshold is misleading.

diff:
- Coordinator overhead grows with N while parallelism gain saturates past N=4.…
+ Coordinator overhead grows with N while parallelism gain saturates past N=4 for I/O-heavy tasks.
+ The break-even N varies by task class.…
apply? (y/n) > y

outcomes? (e.g. produced_knowledge workflow/parallel-dispatch-task-class-thresholds)
> produced_knowledge workflow/parallel-dispatch-task-class-thresholds
> done

status: draft → implemented? (y/n) > y

writing diff to paper/workflow/parallel-dispatch-breakeven-point/PAPER.md … done
running /hub-paper-verify … PASS

EXPERIMENT CLOSED.
Next: /hub-publish --only paper --pr
```

## Why exists

The first paper to close its loop in this hub (`paper/workflow/parallel-dispatch-breakeven-point`) took multiple manual edits across frontmatter sections and a body-section rewrite. That friction explains why so many papers stay at `status: draft` with `experiments[].status: planned` indefinitely. This command makes the closing step deliberate and verified, instead of "remember to update three fields and re-run lint".
