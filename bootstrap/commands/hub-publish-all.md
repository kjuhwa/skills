---
description: One-shot publish of both `.skills-draft/` and `.knowledge-draft/` to kjuhwa/skills.git on a single branch with a single PR
argument-hint: [--all] [--pr] [--branch=<name>] [--bump=major|minor|patch] [--only skills|knowledge]
---

# /hub-publish-all $ARGUMENTS

Combined publisher — runs the `/hub-publish-skills` and `/hub-publish-knowledge` pipelines back-to-back, on the **same feature branch**, producing one PR that captures both the procedure (skills) and the rationale (knowledge) from a single extraction round.

Use when `/hub-extract` (or `/hub-extract`) produced drafts in **both** `.skills-draft/` and `.knowledge-draft/` and you want them shipped as one logical change.

## Preconditions

- Union of `/hub-publish-skills` and `/hub-publish-knowledge` preconditions.
- At least one draft under `.skills-draft/` OR `.knowledge-draft/` (if both empty, stop).
- `~/.claude/skills-hub/remote/` clean (no uncommitted local changes).

## Steps

1. **Enumerate both draft trees**.
   - Skills: `.skills-draft/<category>/<name>/SKILL.md`.
   - Knowledge: `.knowledge-draft/<category>/<slug>.md`.
   - `--only skills` or `--only knowledge` restricts the run to one kind (in which case just defer to the underlying command).
   - If both trees empty: report and stop.

2. **Combined dry-run** (always first)
   - Render one table with both kinds, e.g.:
     ```
     KIND       | CATEGORY | SLUG                              | STATUS  | VERSION/CONF
     skill      | backend  | retry-with-jitter-backoff         | NEW     | v0.1.0-draft → v1.0.0
     skill      | arch     | event-replay-from-offset-store    | UPDATE  | v1.2.1 → v1.2.2
     knowledge  | api      | idempotency-key-per-tenant        | NEW     | high
     knowledge  | pitfall  | feature-flag-sunset-policy        | NEW     | medium
     ```
   - Ask once: publish all / review per-row / abort. Per-row review walks both pipelines' per-draft prompts.
   - `--all` auto-selects publish for every well-formed draft.

3. **Single branch, interleaved commits**
   - Ensure `~/.claude/skills-hub/remote` is on latest main (same reset as the individual commands).
   - Branch name: `--branch=<name>` OR auto `release/combined-<YYYYMMDD>` so it's clear the branch carries both kinds.
   - **Commit order**: knowledge first, then skills.
     - Reason: skills can declare `linked_knowledge` in their SKILL.md; landing knowledge first means the skill commit can already reference the knowledge slug in the same branch.
   - Per-knowledge commit: same as `/hub-publish-knowledge` step 3.
   - Per-skill commit: same as `/hub-publish-skills` step 3 (version resolution, tag prep). If a skill's `linked_knowledge` names a slug published in this run, record the cross-link in registry.json (skills entry → `linked_knowledge: [<slug>]`, knowledge entry → `linked_skills: [<skill>]`).
   - **Capture each skill's commit SHA immediately after the commit** via `git rev-parse HEAD` and store in a `{skill_name: sha}` map. Do **not** rely on `HEAD~N` indexing later — the index is fragile once more commits land (seen in the wild: reversed tag targets when iterating in the wrong order).
   - `registry.json` rebuilt once at the end of the commit sequence, not per-commit, to avoid churn — add a final `Rebuild registry.json` commit if any entries changed.

4. **Rebuild `index.json`**
   - Run `py -3 ~/.claude/skills-hub/tools/_rebuild_index_json.py --root ~/.claude/skills-hub/remote` to regenerate the flat catalog from the current filesystem.
   - If the rebuild produces a larger catalog than the old one, surface the delta count before committing and let the user approve (some entries may be intentionally excluded elsewhere).
   - If there are changes, commit as `chore: rebuild index.json`.
   - **Why this matters**: without this, `/hub-find` and the L1/L2 indexes never see the new entries and appear to have lost them. Missed in early v2.5.x releases; filed as the root cause of PR #1028.

5. **Push + tag + PR** (requires confirmation)
   - `git push -u origin <branch>`.
   - For each **skill**, create the annotated tag `skills/<name>/v<version>` at the captured SHA from the map in step 3 (not at `HEAD`, because other commits have landed since).
   - Push tags: `git push origin --tags` restricted to this run's tags.
   - If `--pr` and `gh` available:
     - `gh pr create --title "Publish <N> skills + <M> knowledge entries" --body ...`
     - Body sections: `## Skills`, `## Knowledge`, `## Cross-links` (skill ↔ knowledge pairs created this run), `## Source` (project/session/commit refs).
     - Add a `## Post-merge` block that tells the reviewer/merger to run step 7 after squash-merge.
   - Otherwise print branch name, tag list, and compare URL.

6. **Cleanup drafts**
   - Move published skill drafts → `.skills-draft/_published/<date>/`.
   - Move published knowledge drafts → `.knowledge-draft/_published/<date>/`.
   - Leave unpublished drafts in place.

7. **Post-merge: re-anchor skill tags** (run AFTER the PR is squash-merged)
   - Squash merge orphans tags created on the release branch — they point at a commit that is no longer reachable from `main` (see knowledge entry `squash-merge-orphans-release-branch-tags`).
   - Fetch: `git fetch origin && git checkout main && git pull --ff-only`.
   - Read the squash-merge commit SHA from the merged PR (`gh pr view <N> --json mergeCommit --jq '.mergeCommit.oid'`).
   - For every tag in this run's tag list:
     ```bash
     git tag -d <tag>
     git tag -a <tag> <merge-commit-sha> -m "<original-message>"
     git push --force origin <tag>
     ```
   - Verify: `git merge-base --is-ancestor <tag> main && echo ok`. All tags must be reachable from main.
   - Skip this step if the PR used a merge commit (not squash) — then the original tag is already reachable.

## Rules

- **Never push to `main` directly.** One feature branch per run.
- **Never skip the dry-run step.**
- If either pipeline aborts mid-run, the branch is kept as-is for inspection — no automatic rollback, no force-push.
- Cross-linking is **opt-in**: only link when a skill's SKILL.md explicitly names a `linked_knowledge` slug, or a knowledge file's frontmatter names `linked_skills`. Never infer links from name similarity.
- Sanitization rules from both underlying commands apply.
- On conflict between `--only` and the presence of drafts in the excluded kind, warn and proceed with the requested kind only; don't silently publish the other.
- If `gh` is unavailable, still push the branch and print a ready-to-paste PR URL + title + body draft.

## When NOT to use

- If you only have skill drafts → `/hub-publish-skills` is simpler.
- If you only have knowledge drafts → `/hub-publish-knowledge` is simpler.
- If drafts come from unrelated sessions → publish separately so PR history stays coherent.
