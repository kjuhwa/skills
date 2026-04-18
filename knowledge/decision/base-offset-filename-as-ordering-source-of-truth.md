---
version: 0.1.0-draft
name: base-offset-filename-as-ordering-source-of-truth
description: Encode segment base offset in the filename so directory listing alone reconstructs ordering after crash.
category: decision
tags:
  - segment
  - auto-loop
---

# base-offset-filename-as-ordering-source-of-truth

When persisting segment files, it's tempting to keep a separate manifest file listing segments in order. This creates a two-writer problem: crash between writing the segment and updating the manifest and you're inconsistent. Instead, encode the base offset in the filename with zero-padding (`000000000000042.log`) so a sorted directory listing *is* the authoritative order. Recovery is `Files.list(dir).sort().map(parseBaseOffset)` — no manifest, no transaction, no corruption window.

The padding width matters: use enough digits (20 for int64) that lexicographic sort equals numeric sort. The `.index` companion file uses the same base offset, so pairing is trivial. Tombstone/compaction output writes to a temp name then atomic-renames to its target base-offset name, which gives crash-atomicity for free via POSIX rename semantics. The only state *not* recoverable from filenames is which segment is currently "active" — solve that by convention: the highest base offset is always active unless a `.sealed` marker file exists alongside it.
