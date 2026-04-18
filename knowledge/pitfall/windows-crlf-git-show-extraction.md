---
version: 0.1.0-draft
name: windows-crlf-git-show-extraction
description: git show on Windows outputs LF while working tree has CRLF, causing false diffs on all extracted files
category: pitfall
source:
  kind: session
  ref: "session-20260417-1945"
confidence: medium
linked_skills:
  - hub-commands-update
  - hub-commands-publish
tags:
  - windows
  - line-endings
  - crlf
  - git-show
---

**Fact:** When extracting files via `git show <ref>:<path> > file` on Windows with Git Bash, output uses LF while the working tree uses CRLF, causing `diff` to report every line as changed.

**Why:** Git's `core.autocrlf` converts LF to CRLF in the working tree, but `git show` outputs raw blob content (LF). Comparing working-tree files (CRLF) against `git show` output (LF) produces false positives.

**How to apply:** When publishing or comparing, normalize line endings: `cat "$file" | sed 's/\r$//' > "$dest"`, or use `diff --strip-trailing-cr` during the diff preview step.

**Evidence:** After `/hub-commands-update` installed 31 command files via `git show`, all appeared modified when running `/hub-commands-publish`. Only 3 had intentional changes; the other 28 were line-ending artifacts.

**Counter / Caveats:** This only affects Windows environments with `core.autocrlf=true`. Unix/macOS systems are unaffected.
