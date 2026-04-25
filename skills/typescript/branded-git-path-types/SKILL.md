---
name: branded-git-path-types
description: Use branded string types (`RepoPath`, `WorktreePath`, `BranchName`) with constructor helpers to prevent accidentally passing one string primitive where another is expected.
category: typescript
version: 1.0.0
version_origin: extracted
tags: [typescript, branded-types, type-safety, git, phantom-types]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
---

# Branded String Types for Git Paths and Branch Names

## When to use

- Your codebase has several kinds of string primitives that look the same but are semantically different: `RepoPath` (canonical git repo root), `WorktreePath` (git worktree directory), `BranchName`, `CodebaseId`, `ConversationId`, etc.
- You keep hitting bugs where someone passes a branch name where a path is expected (or worse, a path where a branch name is expected — the shell swallows it silently).
- You want the compiler to enforce the distinction with minimal runtime cost.

## Steps

1. **Declare private brand symbols** and intersect with `string`:

   ```ts
   declare const REPO_PATH_BRAND: unique symbol;
   declare const BRANCH_NAME_BRAND: unique symbol;
   declare const WORKTREE_PATH_BRAND: unique symbol;

   export type RepoPath = string & { readonly [REPO_PATH_BRAND]: true };
   export type BranchName = string & { readonly [BRANCH_NAME_BRAND]: true };
   export type WorktreePath = string & { readonly [WORKTREE_PATH_BRAND]: true };
   ```

   The brands never exist at runtime (phantom types). The `string &` intersection means you can pass a `RepoPath` anywhere a `string` is expected (great for library APIs) but cannot pass a plain `string` where `RepoPath` is required.

2. **Provide one cast helper per brand**, which validates and asserts the type:

   ```ts
   export function toRepoPath(path: string): RepoPath {
     if (!path) throw new Error('RepoPath cannot be empty');
     return path as RepoPath;
   }
   export function toBranchName(name: string): BranchName {
     if (!name) throw new Error('BranchName cannot be empty');
     return name as BranchName;
   }
   ```

   Runtime validation inside the helper (empty-string rejection, maybe format regex) makes the cast safer than raw `as RepoPath`. The empty-string check alone has caught real bugs.

3. **Design function signatures to consume the branded types**, forcing callers to go through the helpers:

   ```ts
   async function isBranchMerged(
     repoPath: RepoPath,
     branchName: BranchName,
     mainBranch: BranchName,
   ): Promise<boolean> { … }
   ```

   Now `isBranchMerged('my-branch', repoPath, main)` is a compile error — you physically cannot get the argument order wrong.

4. **Union helpers for functions that accept multiple kinds**:

   ```ts
   async function hasUncommittedChanges(
     workingPath: RepoPath | WorktreePath
   ): Promise<boolean> { … }
   ```

   `|`-union the brands when a function works on either.

5. **Pair with discriminated-union error results**:

   ```ts
   export type GitResult<T> = { ok: true; value: T } | { ok: false; error: GitError };
   export type GitError =
     | { code: 'not_a_repo'; path: string }
     | { code: 'permission_denied'; path: string }
     | { code: 'branch_not_found'; branch: string }
     | { code: 'no_space'; path: string }
     | { code: 'unknown'; message: string };
   ```

   At the package boundary, return a `GitResult<T>` instead of throwing raw strings. Callers pattern-match on `code` and get typed `path` / `branch` fields.

## Counter / Caveats

- Brands do **not** survive JSON round-trips. Deserializing from the DB gives you a `string`; you must go back through `toRepoPath(row.path)` to rebrand.
- Brands are not runtime-distinguishable. `typeof repoPath === 'string'` is true. If you need runtime distinction (e.g. structured logging), carry the kind explicitly (e.g. `{ kind: 'repo', path }`).
- Too many brands becomes noise. Good candidates: identifiers from external systems (ids, handles, paths), and values where accidental swap is catastrophic. Bad candidates: every internal function parameter.
- Helpers should throw on invalid input rather than returning `Option<T>` — at the boundary you either have a valid value or you don't want to continue.
- If you're in strict mode, the `unique symbol` declaration trick requires `skipLibCheck: false` to stay robust. Consider a named const symbol if you hit library-type conflicts.

## Evidence

- `packages/git/src/types.ts`:1-26: full declaration of `REPO_PATH_BRAND`, `BRANCH_NAME_BRAND`, `WORKTREE_PATH_BRAND` plus constructors `toRepoPath`, `toBranchName`, `toWorktreePath` with empty-string guards.
- Discriminated-union `GitResult<T>` + `GitError` at `types.ts:29-37`.
- Consumers across the codebase: `packages/git/src/branch.ts` (every signature uses `RepoPath` / `BranchName`), `packages/isolation/src/resolver.ts`, `packages/core/src/services/cleanup-service.ts`.
- Example union at `packages/git/src/branch.ts:118`: `hasUncommittedChanges(workingPath: RepoPath | WorktreePath)`.
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
