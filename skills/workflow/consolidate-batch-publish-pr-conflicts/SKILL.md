---
name: consolidate-batch-publish-pr-conflicts
description: "Consolidate N conflicting batch-publish PRs: filesystem cherry-pick + catalog union-merge, keeping install metadata"
category: workflow
version: 0.1.0-draft
tags:
  - git
  - github
  - pr-conflict
  - recovery
  - batch-publish
  - catalog-merge
triggers:
  - many PRs conflicting
  - registry.json conflict
  - batch publish stuck
  - catalog file conflict storm
---

# Consolidate N conflicting batch-publish PRs into one

## When to activate

A multi-PR auto-publish flow has produced N branches (N ≥ 3) that **all conflict on a shared catalog file** (e.g. `registry.json`, `index.json`, `example/README.md`). Each individual PR is content-only correct; the conflict is purely on the catalog because each PR regenerates it as the sequence advances.

This is the canonical scenario described in `knowledge/workflow/batch-pr-conflict-recovery` and the technique `technique/workflow/safe-bulk-pr-publishing`. This skill is the **executable procedure** for both.

## When NOT to activate

- Conflicts are on actual content files, not just the catalog — those need real merge resolution
- Only 1–2 PRs conflict — sequential rebase is cheaper than the consolidation overhead
- The catalog has no filesystem-derivable regenerator AND no clean union semantic — hand-merge case-by-case instead

## Workflow

### Phase 0: confirm pattern

For every conflicting PR, run a sample merge (`git fetch + git rebase main`) and confirm conflicts are limited to the same single catalog file. If the conflict set varies per PR, this skill does not apply.

### Phase 1: branch + content cherry-pick

```bash
# Start fresh from main
git checkout main && git pull --ff-only
git checkout -b recovery/consolidate-<short-tag>-<yyyymmdd>

# Fetch all conflicting PR branches
BRANCHES=("release/...-batch-05-of-24" "...-batch-06-of-24" ...)
git fetch origin "${BRANCHES[@]}"

# For each branch, copy ONLY content folders — NEVER the catalog file
CONTENT_DIRS=(skills knowledge technique paper example)
for b in "${BRANCHES[@]}"; do
  for d in "${CONTENT_DIRS[@]}"; do
    git checkout "origin/$b" -- "$d/" 2>/dev/null
  done
done
```

The `git checkout <branch> -- <path>` form copies files from another branch into the index without invoking merge machinery. No conflicts possible because we are not merging histories — just copying paths.

### Phase 2: union-merge catalog files

For JSON catalogs (registry.json, etc.):

```python
# union_merge_catalog.py
import json, subprocess

with open("registry.json", encoding="utf-8") as f:
    merged = json.load(f)
merged.setdefault("skills", {})
merged.setdefault("knowledge", {})

for branch in BRANCHES:
    out = subprocess.check_output(
        ["git", "show", f"origin/{branch}:registry.json"],
        text=True, encoding="utf-8")
    pr_reg = json.loads(out)
    # FIRST-SEEN WINS — preserves original install_at, source_commit, etc.
    for slug, meta in pr_reg.get("skills", {}).items():
        if slug not in merged["skills"]:
            merged["skills"][slug] = meta
    for slug, meta in pr_reg.get("knowledge", {}).items():
        if slug not in merged["knowledge"]:
            merged["knowledge"][slug] = meta

with open("registry.json", "w", encoding="utf-8", newline="\n") as f:
    json.dump(merged, f, ensure_ascii=False, indent=2)
    f.write("\n")
```

Why first-seen-wins: original entries on main have authoritative `installed_at` and `source_commit`. Last-wins would overwrite them with re-publish metadata. See `knowledge/decision/union-merge-catalog-first-seen-wins-rationale` (if available).

### Phase 3: regenerate filesystem-derived indexes

For indexes that walk the filesystem (`index.json`):

```bash
python3 bootstrap/tools/_rebuild_index_json.py --root .
```

These regenerate from disk so they automatically reflect the cherry-picked content.

### Phase 4: lint sweep

Large content imports often surface pre-existing data quality issues that lint catches:

```bash
python3 bootstrap/tools/_lint_frontmatter.py
# If failures: run _fix_frontmatter.py for auto-fixable fields
python3 bootstrap/tools/_fix_frontmatter.py --apply --only-missing=name,version,category,tags
# Then handle remaining (e.g. description) manually or via synthesis script
```

### Phase 5: single PR + close originating PRs

```bash
git add -A
git commit -m "recovery: consolidate N batch-publish PRs"
git push -u origin recovery/<branch-name>
gh pr create --title "recovery: consolidate N PRs" --body "..."

# After consolidation PR merges:
COMMENT="Superseded by #<consolidation> — content consolidated via batch-pr-conflict-recovery pattern. Branch preserved."
for n in <pr1> <pr2> ...; do
  gh pr close $n --comment "$COMMENT"
done
```

**Branches stay intact after close** — closing != deleting. Re-importing individual batches later is still possible.

## Verification

After Phase 4 lint passes and Phase 5 PR is opened, confirm:

- `git log --diff-filter=A --name-only origin/main..HEAD | wc -l` shows the expected file count (sum of unique content from all batches)
- `python3 -c "import json; d=json.load(open('registry.json')); print(len(d['skills']), len(d['knowledge']))"` shows union-merged counts
- `index.json` line count grew by roughly the expected delta

## Why this skill exists separately from the knowledge entry

`knowledge/workflow/batch-pr-conflict-recovery` describes the pattern. This skill provides the **runnable script + decision points** so a future operator can execute without re-deriving each phase. The knowledge entry is the *what and why*; this skill is the *how, with code*.
