---
name: git-worktree-isolation-per-thread
description: Use git worktrees to isolate filesystem state per conversation thread, avoiding conflicts between concurrent edits
category: git
version: 1.0.0
version_origin: extracted
confidence: high
tags: [git, worktree, concurrency, isolation]
source_type: extracted-from-git
source_url: https://github.com/pingdotgg/t3code.git
source_ref: main
source_commit: 9df3c640210fecccb58f7fbc735f81ca0ee011bd
source_project: t3code
imported_at: 2026-04-18
evidence:
  - apps/server/src/git/Layers/GitCore.ts
  - .docs/encyclopedia.md
  - .docs/workspace-layout.md
---

## When to Apply
- You manage multiple long-running agent threads in the same repository
- Threads may edit overlapping files concurrently without blocking each other
- You want to capture "turn diffs" per thread without conflict resolution complexity
- You need to snapshot state at checkpoint boundaries and restore old states

## Steps
1. On thread creation, check if thread should use a worktree (e.g., `worktreePath` in thread contracts)
2. Create a git worktree: `git worktree add <path> <branch>`
3. Worktree path is stored in thread state; all thread operations (git, filesystem) use that path
4. On turn start, capture a checkpoint: save current HEAD as a git ref (hidden, prefixed)
5. After turn completes, compute diff between checkpoint and current HEAD
6. On thread delete or reset, clean up worktree: `git worktree remove <path> --force`
7. Optionally, dedupe worktrees: if two threads reference same commit, share a worktree

## Example
```typescript
// Thread creation
const worktreePath = `${workspaceRoot}/.worktrees/${threadId}`
yield* GitCore.createWorktree({ path: worktreePath, ref: 'main' })
thread.worktreePath = worktreePath

// Turn checkpoint
const checkpointRef = `refs/hidden/checkpoint/${threadId}/${turnId}`
yield* GitCore.updateRef(checkpointRef, 'HEAD')

// Turn diff
const diff = yield* GitCore.getDiff(checkpointRef, 'HEAD', { path: worktreePath })
```

## Counter / Caveats
- Worktrees consume disk space; each is a separate `.git` directory
- If worktree is deleted externally, git state is orphaned; add cleanup in startup readiness
- Worktree can diverge from main tree; branch consistency is caller's responsibility
- On Windows, worktree paths must not conflict with symlinks in main tree
