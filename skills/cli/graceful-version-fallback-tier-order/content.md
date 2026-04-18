# Graceful version fallback — 4-tier resolution order

## Problem

A CLI installs pinned versions of registry artifacts using git tags (e.g. `name@1.0.0` → tag `artifacts/<name>/v1.0.0`). When the tag is missing — typo, not yet cut, tag got orphaned by a squash merge — the naive behavior is to error out:

```
error: tag artifacts/foo/v1.0.0 not found
```

That's a dead end. The user has three realistic reasons for the failure and no way to tell which:

1. **Typo** (mine, or the demo's): the version they typed doesn't exist, but a similar one does.
2. **Never tagged**: the registry *declares* this version in the frontmatter but nobody cut the tag yet (common during draft-phase releases).
3. **Nothing tagged**: the artifact has no version tags at all (brand-new skill, frontmatter says `0.1.0-draft`).

Case 2 and 3 both cost a support round-trip if the error says only "tag not found."

## Pattern

Resolve `name@version` in a strict 4-tier order. Stop at the first match.

```
tier 1  tag match
        └─ tag `artifacts/<name>/v<version>` resolves → use that tag

tier 2  frontmatter match on main
        └─ tag missing, but `<main>/<artifact-path>/META.md` declares
           `version: <same-version>` → install from main HEAD
           print ONE warning line:
             "note: no tag for v<version>, but main declares this version
              in frontmatter — installing from main"
           mark registry entry pinned=true (user asked for a specific version)

tier 3  no tags exist AT ALL for this artifact
        └─ `git tag -l 'artifacts/<name>/v*'` returns empty
           print ONE friendly hint:
             "this artifact has no version tags yet. Drop '@<version>'
              to install from main, or use --force-main to proceed anyway."
           stop, exit 1 — unless --force-main is present

tier 4  no match + other tags exist
        └─ list them via `git tag -l 'artifacts/<name>/v*'`
           "available versions: v0.9.0, v0.9.1, v1.1.0 — pick one"
           stop, exit 1 (user explicitly picks, no auto-upgrade)
```

No tier ever silently installs a different version than the user asked for. The only "install from main with a warning" tier (tier 2) requires that the frontmatter still *says* it's that same version — i.e. the tag is missing but main is already at that version.

## Why this exact order

- **Tag first**: tags are immutable references, the canonical source for pinned installs.
- **Frontmatter second**: main's frontmatter is the next-most-authoritative — the declared version at HEAD — and usually the tag missing just means "nobody has cut it yet, but the content is frozen."
- **"No tags yet" hint before "other tags exist"**: different user-facing message. Tier 3 is "you're probably confused" (draft artifact, no versions). Tier 4 is "you typed the wrong version" (versions exist, yours isn't one).
- **`--force-main` escape hatch**: users who understand the risk (e.g. they're locally re-pinning a draft to a target version) can opt past tier 3 without needing to also pass `@<version>` separately.

## Example pseudocode

```python
def resolve_ref(name, version, force_main=False):
    tag = f"refs/tags/artifacts/{name}/v{version}"
    if git_rev_parse_verify(tag):
        return Ref(kind="tag", ref=tag, pinned=True)              # tier 1

    fm = read_frontmatter(f"main:artifacts/{name}/META.md")
    if fm and fm.get("version") == version:
        warn(f"note: no tag exists for v{version}, but main declares "
             f"this version in frontmatter — installing from main")
        return Ref(kind="main", ref="main", pinned=True)          # tier 2

    other_tags = git_tag_list(f"artifacts/{name}/v*")
    if not other_tags:
        if not force_main:
            print(f"hint: this artifact has no version tags yet. "
                  f"Drop '@{version}' to install from main, "
                  f"or use --force-main to proceed anyway.")
            sys.exit(1)
        warn(f"--force-main: installing @{version} from main HEAD "
             f"(no tag backs this version)")
        return Ref(kind="main", ref="main", pinned=True)          # tier 3

    print(f"available versions: {', '.join(other_tags)} — pick one")
    sys.exit(1)                                                    # tier 4
```

## When to apply

- Any CLI that installs from a git-tag-versioned registry (package manager, skill hub, plugin repo, config catalog).
- Registries where draft-phase artifacts exist on main before a tag is cut.
- Situations where the naive "tag or nothing" UX has led to user support load.

## When NOT to apply

- When **only** tagged versions are legal (strict supply-chain registries). Tiers 2 and 3 intentionally install from un-tagged main; if your security model forbids that, keep "tag or bust".
- When frontmatter version is untrusted (e.g. contributor-controlled) and tags are the authority. Tier 2 would let a malicious PR trick users into installing from main by editing the frontmatter to match a version they want to impersonate.

## Evidence

Introduced in skills-hub bootstrap v2.6.3 after the `jwt-refresh-rotation-spring@1.0.0` demo failed: the skill's frontmatter version is `0.1.0-draft` and no tags have been cut. The old behavior printed `error: tag skills/jwt-refresh-rotation-spring/v1.0.0 not found` and stopped. The v2.6.3 tier-3 hint offers two paths forward (drop `@version` or `--force-main`) without reintroducing ambiguity — same install request, strictly more actionable failure.
