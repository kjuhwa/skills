---
description: One-shot publish of both `.skills-draft/` and `.knowledge-draft/` to kjuhwa/skills.git on a single branch with a single PR
argument-hint: [--all] [--pr] [--branch=<name>] [--bump=major|minor|patch] [--only skills|knowledge]
---

# /publish_all $ARGUMENTS

Combined publisher — runs the `/skills_publish` and `/knowledge_publish` pipelines back-to-back, on the **same feature branch**, producing one PR that captures both the procedure (skills) and the rationale (knowledge) from a single extraction round.

Use when `/skills_extract_project` (or `/skills_extract_knowledge`) produced drafts in **both** `.skills-draft/` and `.knowledge-draft/` and you want them shipped as one logical change.

## Preconditions

- Union of `/skills_publish` and `/knowledge_publish` preconditions.
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
   - Per-knowledge commit: same as `/knowledge_publish` step 3.
   - Per-skill commit: same as `/skills_publish` step 3 (version resolution, tag prep). If a skill's `linked_knowledge` names a slug published in this run, record the cross-link in registry.json (skills entry → `linked_knowledge: [<slug>]`, knowledge entry → `linked_skills: [<skill>]`).
   - `registry.json` rebuilt once at the end of the commit sequence, not per-commit, to avoid churn — add a final `Rebuild registry.json` commit if any entries changed.

4. **Push + tag + PR** (requires confirmation)
   - `git push -u origin <branch>`.
   - For each **skill**, create annotated tag `skills/<name>/v<version>` (knowledge has no tags).
   - Push tags: `git push origin --tags` restricted to this run's tags.
   - If `--pr` and `gh` available:
     - `gh pr create --title "Publish <N> skills + <M> knowledge entries" --body ...`
     - Body sections: `## Skills`, `## Knowledge`, `## Cross-links` (skill ↔ knowledge pairs created this run), `## Source` (project/session/commit refs).
   - Otherwise print branch name, tag list, and compare URL.

5. **Cleanup drafts**
   - Move published skill drafts → `.skills-draft/_published/<date>/`.
   - Move published knowledge drafts → `.knowledge-draft/_published/<date>/`.
   - Leave unpublished drafts in place.

## Rules

- **Never push to `main` directly.** One feature branch per run.
- **Never skip the dry-run step.**
- If either pipeline aborts mid-run, the branch is kept as-is for inspection — no automatic rollback, no force-push.
- Cross-linking is **opt-in**: only link when a skill's SKILL.md explicitly names a `linked_knowledge` slug, or a knowledge file's frontmatter names `linked_skills`. Never infer links from name similarity.
- Sanitization rules from both underlying commands apply.
- On conflict between `--only` and the presence of drafts in the excluded kind, warn and proceed with the requested kind only; don't silently publish the other.
- If `gh` is unavailable, still push the branch and print a ready-to-paste PR URL + title + body draft.

## When NOT to use

- If you only have skill drafts → `/skills_publish` is simpler.
- If you only have knowledge drafts → `/knowledge_publish` is simpler.
- If drafts come from unrelated sessions → publish separately so PR history stays coherent.
