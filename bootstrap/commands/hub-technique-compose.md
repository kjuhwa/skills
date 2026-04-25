---
description: Interactively compose a new technique draft from installed skills/knowledge, then verify it against the v0.1 schema
argument-hint: <slug> [--category <cat>] [--from <existing-slug>]
---

# /hub-technique-compose $ARGUMENTS

Authoring workflow for the `technique/` middle layer. Produces a `.technique-draft/<category>/<slug>/TECHNIQUE.md` scaffolded from user-selected atoms, then runs `/hub-technique-verify` to confirm the draft passes v0.1 schema rules before handing control back.

## Input

- **`<slug>`** (required): technique folder name. Must be kebab-case, unique within the draft root (`.technique-draft/`) AND the installed root (`~/.claude/techniques/`).
- `--category <cat>`: one of `CATEGORIES.md` values. If omitted, ask.
- `--from <existing-slug>`: clone frontmatter + composes of an existing technique as starting point. User still confirms each field.

## Steps

1. **Validate slug**:
   - Fail if `.technique-draft/**/<slug>/` or `~/.claude/techniques/**/<slug>/` already exists.
   - Fail if slug is not kebab-case (`^[a-z][a-z0-9-]*$`).

2. **Collect frontmatter** (AskUserQuestion per field, defaulting sensibly):
   - `description` — remind user ≤120 chars. If exceeded, warn and let them revise or accept warning.
   - `category` — offer picker from `CATEGORIES.md` if not provided via flag.
   - `tags` — comma-separated; dedupe.
   - `binding` — default `loose`. Explain tradeoff before asking.

3. **Pick composes[]** (iterative loop, minimum 2 atoms required):
   - Ask user: "search for atom to add? (or `done` to finish)".
   - On keyword: delegate to `/hub-find` flow, show top N results with `kind` badge.
   - User picks a row; prompt for:
     - `role`: free-text label for this atom's job in the composition (e.g. `orchestrator`, `failure-recovery`).
     - `version`: default `^<major>.<minor>.0` for stable atoms, `"*"` for `*-draft` atoms. Let user override.
   - Record the ref as **kind-root-relative physical path** (verify the real file exists on disk before accepting).
   - After each add, show running list.
   - Reject: atom whose `kind` is `technique` (v0 nesting ban).
   - Stop condition: user says `done` AND `composes[].length >= 2`. If `< 2`, warn: "a technique with fewer than 2 atoms is just a skill — continue anyway?".

4. **Optional verify hook**:
   - Ask: "scaffold `verify.sh`? (yes/no)".
   - If yes, write a bash check that re-asserts each `composes[].ref` file exists. Same template as §11 of `technique-schema-draft.md`.

5. **Write the file**:
   - Target: `.technique-draft/<category>/<slug>/TECHNIQUE.md`.
   - Frontmatter: version `0.1.0-draft`, name = slug, all collected fields.
   - Body template:
     ```
     # <Title Case of slug>

     > Short positioning paragraph. Fill in purpose.

     ## When to use
     - ...

     ## When NOT to use
     - ...

     ## Phase sequence
     (describe how the composes[] are invoked in order)

     ## Glue summary
     | 추가 요소 | 위치 |
     | --- | --- |

     ## Known limitations
     - ...
     ```
   - If `--from <existing-slug>` was passed, seed body from that file and mark sections TODO.
   - The `## Composes` section is NOT written by hand — step 6 generates it from the frontmatter.

6. **Inject Composes section** (vertical, narrow-friendly mirror of frontmatter)
   - Run: `python ~/.claude/skills-hub/remote/bootstrap/tools/_inject_references_section.py --only technique --write`
     (idempotent; bounded by `<!-- references-section:begin/end -->` markers).
   - Inserts `## Composes` immediately before `## When to use`.

7. **Immediate verification**:
   - Run `/hub-technique-verify <slug>`.
   - If FAIL, print the verifier output and offer: re-open for edit, revert (delete the draft folder), or leave as-is.
   - If PASS/WARN, print location and next-step hint:
     ```
     DRAFT CREATED: .technique-draft/<category>/<slug>/TECHNIQUE.md
     Next: /hub-technique-show <slug>
     Or:   iterate on the body, then re-run /hub-technique-verify <slug>
     ```

## Rules

- **Never write to** `~/.claude/techniques/` — that's the installed root, reserved for publish flow (not in v0.1 scope).
- **Never call remote**. Authoring uses only the already-synced `~/.claude/skills-hub/remote/`. Stale cache → warn and suggest `/hub-sync`.
- **Never silently reject draft atoms**. If an atom is `*-draft`, prompt: "this atom is still in draft — compose anyway? (y/n)" — don't assume.
- Authoring is a **write pass**; verification is a **separate pass** (step 7). Do not collapse them — keep the separation so the user sees the draft before it gets validated.

## Discovery — _suggest_techniques.py

If you don't already have a technique idea, run:

```
python ~/.claude/skills-hub/remote/bootstrap/tools/_suggest_techniques.py
```

The tool walks every existing technique's `composes[]` AND every paper's `proposed_builds[].requires[]`, finds atom bundles that recur in ≥2 different parent entries, and ranks them as candidate new techniques. Output looks like:

```
--- Bundle 1 (4 atoms) ---
  • knowledge/pitfall/idempotency-implementation-pitfall
  • skill/architecture/optimistic-mutation-pattern
  • skill/backend/migration-processor-pipeline
  • skill/workflow/idempotency-data-simulation
  Parents containing ≥2 of these atoms:
    [technique] db/idempotent-migration-with-resume-checkpoint  (3 of 4)
    [technique] frontend/optimistic-mutation-with-server-reconcile  (3 of 4)
    [build] db/migration-checkpoint-overhead/migration-checkpoint-granularity-benchmark  (2 of 4)
```

The tool runs automatically via `precheck.py` (post-merge / post-commit hooks). Bundles are *suggestions* — false positives include common dependencies that aren't worth their own technique. Use the parent list to judge whether the bundle is a genuine pattern or coincidental overlap.

## Out of scope (v0.1)

- Publishing to remote hub (`/hub-technique-publish` — later).
- Nested technique composition (v0 forbids).
- Multi-file techniques beyond TECHNIQUE.md + optional verify.sh + resources/.

## Why exists

`/hub-technique-verify` is a gatekeeper but you need a thing to gate. Without compose, every draft is hand-crafted from memory of the schema — high friction, easy to get ref paths wrong (see pilot's discovery that category ≠ path). Compose enforces path correctness at write time instead of at verify time.
