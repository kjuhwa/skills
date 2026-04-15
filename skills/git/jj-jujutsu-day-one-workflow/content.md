# jj day-1 workflow

jj (Jujutsu) has a git-compatible backend: you can use it on a git repo without forcing collaborators to switch. This skill covers the minimum commands to get productive in a day without losing your git mental model.

## When to use

- You want to try jj on a personal branch without disrupting a team git workflow.
- You're stuck on a multi-branch refactor and git's rebase/stash dance keeps breaking.
- You want to stack changes where git's index/staging area makes it awkward.

## Steps

1. **Co-locate with git.** In an existing git repo: `jj git init --colocate`. Creates `.jj/` alongside `.git/`; pushes/pulls still go through the git backend.
2. **Check state.** `jj st` — working copy + current change summary. No "staged vs unstaged" distinction: every change in the working copy is part of the current change.
3. **Describe the current change.** `jj describe -m "..."` — edits the message of the change you're currently on. You can redescribe freely; there's no "amend vs rewrite history" tension.
4. **Start a new change.** `jj new` — creates a fresh empty change on top. Conceptually like `git commit --allow-empty && new branch`, but without the branch.
5. **View history.** `jj log` — shows your changes plus their relation to the git commits. Use `jj log -r @` to focus on the current chain.
6. **Push to git.** Create a git bookmark (jj's named pointer): `jj bookmark set main -r @` then `jj git push --bookmark main`.

## Success criteria

- You can make, describe, split, and push a change without reaching for git commands.
- Teammates see normal git commits; nothing signals jj was used.
- You can abandon (`jj abandon`) a change without worrying about reflog gymnastics.

## Gotchas

- **No index.** Everything in the working copy is the change. Use `jj split` to carve one change into two; there's no `git add -p`.
- **Change IDs vs commit IDs.** jj has stable change IDs that survive edits; git commits that correspond to them rotate. Refer to changes by change ID, not the git hash, within jj.
- **Bookmarks ≠ branches.** A jj bookmark is just a pointer; it doesn't auto-advance when you commit. Move it explicitly before push, or set up auto-advance.
- **Colocated mode keeps `.git/` writable.** If you run a git command inside a jj repo, jj will detect the drift and reconcile on the next jj command — but it's a source of confusion. Pick one.
- **Conflicts are first-class.** jj keeps conflicts in the change rather than refusing to merge. This is powerful but surprising if you expect the git "abort and retry" loop.

## Five-command cheat sheet

- `jj git init --colocate` — init on top of an existing git repo.
- `jj st` — working copy + current change.
- `jj describe -m "..."` — edit current change's message.
- `jj new` — start a new change on top.
- `jj log` — history.

Plus: `jj bookmark set <name> -r @`, `jj git push --bookmark <name>`, `jj split`, `jj abandon`.

## Mental-model deltas from git

- No staging area. Working copy = current change.
- Change IDs are stable across edits; git commit hashes are derived and rotate.
- Conflicts live inside a change rather than blocking the operation.
- Bookmarks are passive pointers; they don't auto-follow new commits.

## Source

- https://steveklabnik.github.io/jujutsu-tutorial/introduction/what-is-jj-and-why-should-i-care.html — Steve Klabnik's jj tutorial (introduction).
- Research lane: skills_research trend survey, 2026-04-16 window.
