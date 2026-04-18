---
name: publish-pipelines-must-rebuild-derived-artifacts
type: knowledge
category: pitfall
tags: [publish-pipeline, index, registry, derived-artifact, stale-cache, search, silent-failure]
summary: A publish flow that commits new source files but doesn't regenerate derived artifacts (flat catalog, search index, registry cache) leaves downstream consumers (search, suggestion, discovery) unable to see the new entries. Every publish pipeline needs an explicit reindex step.
source: { kind: session, ref: hub-publish-all-pr-1027 }
confidence: high
linked_skills: []
supersedes: null
extracted_at: 2026-04-18
---

## Fact

If your publish pipeline:
1. Copies new source files to the repo ✓
2. Commits them ✓
3. Creates tags ✓
4. Opens a PR ✓

…but does NOT regenerate any derived artifact (flat catalog like `index.json`, a registry cache, a pre-computed search index), then:

- `git log` shows the new files landed.
- `git show` returns them correctly.
- But the **search tool that reads the derived artifact sees nothing**. New entries are invisible.

Worst-case: users type what should be a perfect query, get zero results, conclude "the publish didn't work," re-publish, still broken. Root cause is upstream of the user.

## Context / Why

Observed on `/hub-publish-all` (PR #1027): 6 new entries landed cleanly on `main` with proper commits, proper tags, proper PR. `/hub-find "rollback anchor"` returned `git-tag-registry-versioning` (a similar but different entry) and not the new `rollback-anchor-tag-before-destructive-op`. Why? `index.json` wasn't updated. The publish spec included commit-each-entry + push + tag + PR, but no "rebuild flat catalog" step.

The fix was a follow-up PR #1028 just to reindex. This is a pipeline smell — derived-artifact refresh should be baked into the pipeline, never a manual afterthought.

## Evidence

Before the fix:

```bash
$ grep -c "rollback-anchor-tag-before-destructive-op" ~/.claude/skills-hub/remote/index.json
0  ← missing
$ git -C ~/.claude/skills-hub/remote log main -1 --stat | grep rollback
  skills/workflow/rollback-anchor-tag-before-destructive-op/SKILL.md | 55 +++
  ← file IS on main, but index.json was never updated
```

After rebuilding `index.json` from the filesystem:

```bash
$ hub-search "rollback anchor tag destructive" -n 1
[ 64] skill/workflow  rollback-anchor-tag-before-destructive-op  ← now findable
```

## Applies when

- You have a publish pipeline that adds content to a corpus.
- Any downstream tool (search, suggestion, discovery, dashboard) reads a **derived artifact** (cache, flat catalog, embedding index, sitemap, etc.) instead of walking the source tree on every query.
- The derived artifact and the source tree can drift.

## Counter / Caveats

**Mitigation pattern**:

1. **Build a deterministic rebuilder**. A single command that reads source tree → writes derived artifact. E.g. `py tools/_rebuild_index_json.py`.
2. **Wire it into the pipeline** as an explicit step just before push. If the rebuild produces no diff, the step is a no-op; if there is a diff, it's committed as `chore: rebuild <artifact>`.
3. **Preserve manually-added fields** during rebuild. If the artifact has non-schema fields (`source_project`, `installed_at`, usage counters), keep them when regenerating.
4. **Surface delta in the PR body**. "Rebuilt index.json: +6 entries, -0 removed." Reviewers can double-check.

**Alternatives that don't work well**:
- ❌ "Ask users to run `/hub-cleanup --reindex` after pulling" → forgotten, drifts.
- ❌ "Regenerate on every query" → slow for large corpora, moves the cost to readers.
- ❌ "Trust the git hook to rebuild" → hooks don't fire on squash-merge via GitHub UI, only on local commit/merge/checkout (see pitfall `git-reset-hard-bypasses-all-hooks`).

**Generalises to**:
- npm/pypi `package.json` `exports` field.
- Docker image manifests.
- Kubernetes CRD registries.
- Sitemap XML for SEO.
- OpenAPI spec aggregations across microservices.

Any system where **new source code + cached summary** must stay in sync needs a publish-time rebuild, not post-publish repair.
