---
name: hermes-skill-manifest-sync
description: Sync bundled skill files to user dir while preserving customizations via origin-hash manifest.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [llm-agents, skills, manifest, sync, idempotent]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Skill Manifest Sync — Bundled → User Dir Without Clobbering Edits

## Context

You ship skills (or any text assets) with your app. On each release you want users to get new skills and *updates to unchanged ones* — but never overwrite skills the user has customized. A simple "cp -rn" misses updates; "cp -r" wipes edits.

Hermes' manifest-based sync (`tools/skills_sync.py`) threads that needle by tracking each skill's "origin hash" — the hash of the bundled version at the time it was last synced.

## When to use

- Bundling editable text files (skills, prompts, templates) with your installer.
- Users are expected to edit some of them but not all.
- You want deterministic "what will change on update?" dry-run output.

## Procedure

### 1. Manifest format v2: `name:origin_hash` per line

```
my-skill:7b3d9f...
other-skill:a1c22e...
```

`origin_hash` is the MD5 of the bundled skill at the time it was synced to the user dir. V1 manifests were plain names — auto-migrate by treating empty hashes as "not synced yet" (`tools/skills_sync.py:52-76`).

### 2. Update decision tree

For each bundled skill:

| User dir has it? | User copy matches origin_hash? | Action |
|---|---|---|
| No — in manifest | — | **Skip** (user deleted it, respect that) |
| No — not in manifest | — | **Copy** (new skill), record hash |
| Yes — not in manifest | — | **Copy** (pre-existing user copy is safe to treat as baseline? no — skip if exists, log conflict) |
| Yes — hash matches | Bundled unchanged | **No-op** |
| Yes — hash matches | Bundled changed | **Update** from bundled, record new hash |
| Yes — hash differs | — | **Skip** (user customized) |

Plus: entries in manifest but not in the bundled dir anymore → drop from manifest (cleanup).

### 3. Bundled dir discovery with env override

```python
def _get_bundled_dir() -> Path:
    env_override = os.getenv("HERMES_BUNDLED_SKILLS")
    if env_override:
        return Path(env_override)
    return Path(__file__).parent.parent / "skills"
```

The env var lets Nix/Flatpak wrappers inject the right path when the code is installed outside its source tree (`tools/skills_sync.py:40-49`).

### 4. Atomic manifest writes

```python
def _write_manifest(entries: Dict[str, str]):
    tmp = MANIFEST_FILE.with_suffix(".tmp")
    tmp.write_text("\n".join(f"{k}:{v}" for k, v in sorted(entries.items())),
                   encoding="utf-8")
    tmp.replace(MANIFEST_FILE)
```

A torn manifest after crash would cause the next sync to re-clobber user edits.

### 5. Run on install / upgrade, not on every app start

The Docker entrypoint calls `tools/skills_sync.py` once per container start (`docker/entrypoint.sh:67-69`). Native installs call it from the post-install hook. Don't call it on every agent invocation — it's filesystem-heavy and skills don't change that often.

### 6. Per-skill directory hashing

Each skill is itself a directory (`SKILL.md` + assets). Hash the whole directory's manifest (sorted relative paths + file hashes) so a change to any file bumps the origin hash.

## Pitfalls

- **Don't use file mtime as the origin marker.** Extraction from tarballs resets mtimes. Hash the contents.
- **Don't treat missing manifest as "first-run, overwrite everything".** Treat it as "assume user-owned" and only add new skills, never overwrite.
- **Keep the manifest file separate from the skills dir scan.** Putting it inside the dir being scanned (e.g. `.bundled_manifest`) is fine — use a leading dot and exclude from the scan glob.
- **When a skill is removed from the bundle**, just drop it from the manifest. Don't delete the user's copy; they may still want it.
