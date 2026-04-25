---
version: 0.1.0-draft
name: repository-identity-vs-project-vs-thread
summary: A RepositoryIdentity is a logical grouping (e.g., for UI); a Project is environment-local with a workspace root; a Thread is a conversation within a project
type: knowledge
category: domain
confidence: high
tags: [domain, terminology, modeling]
source_type: extracted-from-git
source_url: https://github.com/pingdotgg/t3code.git
source_ref: main
source_commit: 9df3c640210fecccb58f7fbc735f81ca0ee011bd
source_project: t3code
imported_at: 2026-04-18
evidence:
  - .docs/encyclopedia.md
  - .docs/remote-architecture.md
---

## Fact
T3 Code has three nested concepts that newcomers often conflate:

1. **RepositoryIdentity** — a logical grouping for the same repository cloned in multiple places (e.g., local and remote)
   - Used for UI sidebar grouping and correlation, not for routing
   - Best-effort; derived from git remote URL
   - Not authoritative

2. **Project** — an environment-local workspace record
   - Belongs to one execution environment (one T3 server)
   - Has a workspaceRoot (filesystem path on that server)
   - May have worktrees for thread isolation
   - A local clone and a remote clone are different projects (different servers/paths)

3. **Thread** — a conversation within a project
   - A durable timeline of messages, activities, and turns
   - Bound to one project (so bound to one environment)
   - Has optional worktreePath (if isolated from project root)
   - Multiple threads can share a worktree or have separate worktrees

## Why it matters
1. **Remote support depends on this** — remote architecture doc says projects stay environment-local; only RepositoryIdentity is shared
2. **UI grouping clarity** — UI groups by RepositoryIdentity but routes to Projects by environment, then Threads within project
3. **Persistence model** — Events are stored per project; Projects and Threads are durable, RepositoryIdentity is derived
4. **Avoids false unification** — tempting to merge local and remote clones as "the same project"; wrong, they're different projects with same logical identity

## Evidence
- Encyclopedia defines all three separately
- Remote architecture explicitly states: "a local clone and a remote clone are different projects"
- Project has workspaceRoot, Thread has optional worktreePath
- RepositoryIdentityResolver derives identity from git remote, not vice versa

## How to apply
- When designing project/thread picker UI, group by RepositoryIdentity for UX but route by Project/Thread for logic
- When persisting, store project-local state only; RepositoryIdentity is UI sugar
- In remote support, same RepositoryIdentity can map to different Projects on different environments
- Document this hierarchy in onboarding; confusion here is common
