---
version: 0.1.0-draft
name: skills-hub-external-clone-cache-layout
summary: The oh-my-claudecode skills hub stashes `/hub-import`'s cloned source repo under `~/.claude/skills-hub/external/<sha1(gitUrl).slice(0,10)>/` and puts the extracted drafts in a sibling `<same-hash>.drafts/` directory. Cleanup means removing both; leaving either behind breaks re-run hermeticity.
category: reference
confidence: medium
tags: [skills-hub, oh-my-claudecode, hub-import, cache, cleanup, sha1, filesystem-layout, reference]
source_type: extracted-from-project
source_project: trending-hub-loop
imported_at: 2026-04-18T00:00:00Z
---

# Skills Hub External Clone Cache Layout

## Path convention

```
~/.claude/skills-hub/external/
├── <hash>/              ← the cloned git repo (working tree + .git)
├── <hash>.drafts/       ← SKILL.md / knowledge md files emitted by /hub-extract
```

where `<hash>` is derived as:

```js
crypto.createHash('sha1').update(gitUrl).digest('hex').slice(0, 10)
```

The **first 10 hex chars** of the SHA1 of the full git URL (e.g. `https://github.com/EvoMap/evolver.git`). That's ~40 bits of collision resistance — acceptable because the domain is "one dev's local clone cache", not a trust boundary.

## Why two siblings instead of nested

- `<hash>/` being a real git clone means a nested `.drafts/` would get caught by `git clean` / `git status` and muddy the working tree.
- Keeping drafts as a sibling lets cleanup remove **one** of them (e.g. keep drafts, drop the clone) without touching the other. `/hub-import --extract-only` leans on this: clone for extraction, keep the drafts, drop the clone.

## Cleanup recipe

```js
const hash = crypto.createHash('sha1').update(gitUrl).digest('hex').slice(0, 10);
const cloneDir  = path.join(HOME, '.claude/skills-hub/external', hash);
const draftsDir = path.join(HOME, '.claude/skills-hub/external', `${hash}.drafts`);
for (const dir of [cloneDir, draftsDir]) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}
```

Always remove **both** after a successful extract cycle, or you get one of two silent bugs:
- Leave the clone → next `/hub-import` of the same URL short-circuits to the stale checkout, missing new commits.
- Leave the drafts → next `/hub-extract` sees the old drafts as "already extracted", produces no new files, and your delta-counter reports `0`.

## Pitfalls

- **Never use the git URL as the path directly.** SSH URLs contain `:` which breaks on Windows; HTTPS URLs contain `/` that forces nested dirs. Hashing sidesteps both.
- **10-char prefix can collide in theory.** In practice it won't (40 bits over a few hundred URLs), but if you script this at scale, use the full hash.
- **The `HOME` resolution differs per platform.** Node's `process.env.HOME ?? process.env.USERPROFILE` is the portable form; don't hardcode `/home/...` or `C:\\Users\\...`.
- **rmSync with `force: true, recursive: true`** is mandatory — the clone has `.git/objects/pack/*.idx` files that are read-only on some platforms, and non-force `rm` will fail partway through leaving an inconsistent half-removed state.
- **This is a convention, not a public contract.** The skills-hub layout could change between OMC versions. Check for both dirs' existence rather than asserting they must exist.

## Related

- `/hub-import` — the command that populates these paths.
- `/hub-extract` — consumes and emits into `<hash>.drafts/`.
- Skill: `artifact-delta-snapshot-counter` — pairs with this cleanup to measure per-cycle output.
