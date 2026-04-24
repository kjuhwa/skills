---
name: artifact-delta-snapshot-counter
description: Attribute "how many outputs did this one run produce?" by taking a filesystem snapshot of the target draft tree before the run, another one after, and diffing the counts. Zero coordination with the child agent — it just writes files; the parent measures.
category: observability
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [observability, attribution, snapshot, filesystem, pipeline, metrics]
source_type: extracted-from-project
source_project: trending-hub-loop
imported_at: 2026-04-18T00:00:00Z
---

# Artifact Delta Snapshot Counter

## When to use

A long-running pipeline invokes a child agent (codegen, extractor, scaffolder) that writes artifacts into a well-known directory. You need to know: *for this specific invocation, how many artifacts got added?* And you cannot make the child cooperate (it's a CLI, it doesn't emit structured metrics).

## Shape

```
            [before snapshot]            [after snapshot]
  count = walk(dir, isArtifact)    count = walk(dir, isArtifact)
                  ↓                               ↓
                 run child process  (writes N new files)
                                 ↓
                     delta = max(0, after - before)
```

## Reference counter (Node)

```js
function countDrafts() {
  const counts = { skills: 0, knowledge: 0 };
  const walk = (dir, filenameMatch) => {
    if (!fs.existsSync(dir)) return 0;
    let n = 0;
    const stack = [dir];
    while (stack.length) {
      const d = stack.pop();
      for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) stack.push(p);
        else if (filenameMatch(f)) n++;
      }
    }
    return n;
  };
  counts.skills    = walk(SKILLS_DRAFT,    f => f === 'SKILL.md');
  counts.knowledge = walk(KNOWLEDGE_DRAFT, f => f.endsWith('.md'));
  return counts;
}

const before = countDrafts();
await runChild();
const after = countDrafts();
const skillsAdded    = Math.max(0, after.skills    - before.skills);
const knowledgeAdded = Math.max(0, after.knowledge - before.knowledge);
```

## Rules

- **Match by filename, not by directory membership.** A skill is identified by `SKILL.md`; a knowledge note by any `*.md` under the knowledge tree. This means a new skill directory with only a `content.md` doesn't count — good, because it's incomplete.
- **`max(0, delta)`.** If the child *removes* entries for some reason (merging dupes, cleanup), don't report negative adds. Negative deltas should trigger a warning log, not a negative metric.
- **Snapshot immediately before and after.** Any file activity from other processes (IDE indexer, backup tool) between the snapshots leaks into the attribution. For a busy dev machine, accept that deltas are approximate; for CI, they're exact.
- **Serialize runs.** Two children writing to the same tree concurrently cannot be disambiguated by before/after counts. If you need per-child attribution with concurrency, have each child write under a run-id subfolder and count per-subfolder.
- **Don't `fs.stat` every file if you only need counts.** `readdirSync` + `isDirectory` is O(files); statting each entry is the same cost. But if you only care about top-level counts (each skill is one directory), `readdirSync(SKILLS_DRAFT).length` after filtering categories is faster.
- **Log the counts even when zero.** "Drafts: +0 skills, +0 knowledge" is *signal* — the run completed successfully but produced nothing. Silence looks like a crashed measurement, not a genuine zero.

## Counter / Caveats

- **Cannot distinguish "added" from "modified".** The snapshot counts files, not content. If the child overwrites an existing `SKILL.md` in place, delta is zero. Use content hashing (hash before/after per path) if you need "changed" semantics.
- **Cannot attribute across children.** Two children in the same run share the same before/after window. Split into per-child before/after if you need per-child accounting.
- **Not a security boundary.** A rogue child that writes to a totally unrelated path still passes this check. Pair with a filesystem-boundary check (scoped cwd, chroot, container) if integrity matters.
- **Edge case — filesystems with atomic renames.** If the child writes via temp-then-rename, a snapshot taken mid-rename may or may not see the file. Real FSes are atomic enough that this rarely matters, but high-frequency polling can see "flicker" during large writes.

## Related

- Skill: `claude-cli-unattended-wrapper` — the spawner whose effects you're counting.
- Pattern: wrap in a Prometheus/OpenTelemetry gauge if this feeds a real metrics system, not just a dashboard.
