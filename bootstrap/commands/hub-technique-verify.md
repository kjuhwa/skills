---
description: Validate a technique against the v0.1 schema — composes exist, versions intersect, no nesting, frontmatter well-formed
argument-hint: <slug> | --all [--strict]
---

# /hub-technique-verify $ARGUMENTS

Run the schema-draft §9 verification rules against one technique (or all). This is the **canonical gatekeeper** for the `technique/` layer — if this passes, the technique is consistent with the v0.1 schema.

## Input resolution

- `<slug>`: locate first match in `./.technique-draft/**/<slug>/TECHNIQUE.md`, then `~/.claude/techniques/**/<slug>/TECHNIQUE.md`. Ambiguity → list matches and abort.
- `--all`: verify every technique in both locations.

## Checks (from schema-draft §9)

For each technique:

1. **Frontmatter well-formed**: YAML parses; required keys present: `version`, `name`, `description`, `category`, `composes`.
2. **Name matches folder**: `name` == containing directory name.
3. **Description length**: ≤ 120 chars. (Warning only unless `--strict`.)
4. **`composes[]` references exist on disk**:
   - `kind: skill` → `~/.claude/skills-hub/remote/skills/<ref>/SKILL.md`
   - `kind: knowledge` → `~/.claude/skills-hub/remote/knowledge/<ref>.md`
   - `ref` is **kind-root-relative physical path** (not `{category}/{slug}` semantic form). A ref may or may not include a category segment — verify the actual file.
5. **Version range intersection**: parse each atom's frontmatter `version`; confirm the technique's `composes[i].version` (semver range) intersects. When the atom is `*-draft`, skip range check and emit a `DRAFT` note.
6. **No technique-to-technique references**: `kind` must be `skill` or `knowledge` only. `kind: technique` is rejected in v0.
7. **`verify.sh` hook**: if the technique folder has an executable `verify.sh`, run it and require exit 0. On non-POSIX shells, fall back to `bash verify.sh`.
8. **Binding consistency**: if `binding: pinned`, every `composes[].version` must be an exact version (not a range, no `*`).

## Output format

Per technique:
```
TECHNIQUE: <category>/<slug>  (v<version>, binding=<binding>)
  [PASS]  name matches folder
  [PASS]  frontmatter well-formed
  [WARN]  description 137 chars (>120)
  [PASS]  composes[0] parallel-build-sequential-publish → skills/parallel-build-sequential-publish/SKILL.md
  [FAIL]  composes[1] missing: skills/workflow/<slug>/SKILL.md
  [NOTE]  composes[2] skipped version range (atom is 0.1.0-draft)
  [PASS]  no technique nesting
  [PASS]  verify.sh exit 0
RESULT: FAIL (1 error, 1 warning)
```

With `--all`, end with an aggregate: `<K> techniques verified: <pass> pass, <warn> warn, <fail> fail`.

## Exit behavior

- Any `FAIL` → command reports overall failure (exit-equivalent in agent output).
- `WARN` only → pass with advisory.
- `--strict` upgrades `WARN` to `FAIL`.

## Rules

- Read-only. No mutation.
- Does **not** fetch from remote — assumes `~/.claude/skills-hub/remote/` is current. If stale, user should run `/hub-sync` first. Warn when `remote/` is older than 7 days.
- Never auto-fix. This is the gatekeeper; authoring is separate (`/hub-technique-compose`, not yet implemented).

## Why exists

The technique schema is useless without a tool that enforces it. Every rule in schema-draft §9 is exercised here. If a rule cannot be checked by this command, the rule is not real.
