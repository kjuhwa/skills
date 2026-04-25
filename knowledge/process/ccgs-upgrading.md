---
version: 0.1.0-draft
name: ccgs-upgrading
summary: Upgrade guide for migrating between CCGS template versions
category: process
confidence: medium
tags: [game-studios, ccgs, upgrade, migration, versioning]
source_type: extracted-from-git
source_url: https://github.com/Donchitos/Claude-Code-Game-Studios.git
source_ref: main
source_commit: 666e0fcb5ad3f5f0f56e1219e8cf03d44e62a49a
source_project: Claude-Code-Game-Studios
source_path: UPGRADING.md
imported_at: 2026-04-18T00:00:00Z
---

# Upgrading Claude Code Game Studios

This guide covers upgrading your existing game project repo from one version
of the template to the next.

**Find your current version** in your git log:
```bash
git log --oneline | grep -i "release\|setup"
```
Or check `README.md` for the version badge.

---

## Table of Contents

- [Upgrade Strategies](#upgrade-strategies)
- [v0.4.x → v1.0](#v04x--v10)
- [v0.4.0 → v0.4.1](#v040--v041)
- [v0.3.0 → v0.4.0](#v030--v040)
- [v0.2.0 → v0.3.0](#v020--v030)
- [v0.1.0 → v0.2.0](#v010--v020)

---

## Upgrade Strategies

There are three ways to pull in template updates. Choose based on how your
repo is set up.

### Strategy A — Git Remote Merge (recommended)

Best when: you cloned the template and have your own commits on top of it.

```bash
# Add the template as a remote (one-time setup)
git remote add template https://github.com/Donchitos/Claude-Code-Game-Studios.git

# Fetch the new version
git fetch template main

# Merge into your branch
git merge template/main --allow-unrelated-histories
```

Git will flag conflicts only in files that both the template *and* you have
changed. Resolve each one — your game content goes in, structural improvements
come along for the ride. Then commit the merge.

**Tip:** The files most likely to conflict are `CLAUDE.md` and
`.claude/docs/technical-preferences.md`, because you've filled them in with
your engine and project settings. Keep your content; accept the structural changes.

---

### Strategy B — Cherry-pick specific commits

Best when: you only want one specific feature (e.g., just the new skill, not
the full update).

```bash
git remote add template https://github.com/Donchitos/Claude-Code-Game-Studios.git
git fetch template main

# Cherry-pick the specific commit(s) you want
git cherry-pick <commit-sha>
```

Commit SHAs for each version are listed in the version sections below.

---

### Strategy C — Manual file copy

Best when: you didn't use git to set up the template (just downloaded a zip).

1. Download or clone the new version alongside your repo.
2. Copy the files listed under **"Safe to overwrite"** directly.
3. For files under **"Merge carefully"**, open both versions side-by-side
   and manually merge the structural changes while keeping your content.

---

## v0.4.1

**Released:** 2026-04-02
**Key themes:** Art direction integration, asset specification pipeline

### What Changed

| Category | Changes |
|----------|---------|
| **New skill** | `/art-bible` — guided section-by-section visual identity authoring (9 sections). Mandatory art-director Task spawn per section. AD-ART-BIBLE sign-off gate. Required at Technical Setup phase. |
| **New skill** | `/asset-spec` — per-asset visual spec and AI generation prompt generator. Reads art bible + GDD/level/character docs. Writes `design/assets/specs/` files and `design/assets/asset-manifest.md`. Full/lean/solo modes. |
| **New director gates (3)** | `AD-CONCEPT-VISUAL` (brainstorm Phase 4), `AD-ART-BIBLE` (art bible sign-off), `AD-PHASE-GATE` (gate-check panel) |
| **`/brainstorm` update** | Added `Task` to allowed-tools (was missing — blocked all director spawning). Art-director now spawns in parallel with creative-director after pillars lock. Visual Identity Anchor written to game-concept.md. |
| **`/gate-check` update** | Art-director added as 4th parallel director (AD-PHASE-GATE). Visual artifact checks: Visual Identity Anchor (Concept gate), art bible (Technical Setup gate), AD-ART-BIBLE sign-off + character visual profiles (Pre-Production gate). |
| **`/team-level` update** | Art-director added to Step 1 parallel spawn (visual direction before layout). Level-designer now receives art-director targets as explicit constraints. Step 4 art-director role corrected to production-concepts only. |
| **`/team-narrative` update** | Art-director added to Phase 2 parallel spawn (character visual design, environmental storytelling, cinematic tone). |
| **`/design-system` update** | Routing table expanded with art-director + technical-artist for Combat, UI, Dialogue, Animation/VFX, Character categories. Visual/Audio section now mandatory (with art-director Task spawn) for 7 system categories. |
| **`workflow-catalog.yaml`** | `/art-bible` added to Technical Setup (required). `/asset-spec` added to Pre-Production (optional, repeatable). |

### Files: Safe to Overwrite

**New files to add:**
```
.claude/skills/art-bible/SKILL.md
.claude/skills/asset-spec/SKILL.md
.claude/docs/director-gates.md
```

**Existing files to overwrite (no user content):**
```
.claude/skills/brainstorm/SKILL.md
.claude/skills/gate-check/SKILL.md
.claude/skills/team-level/SKILL.md
.claude/skills/team-narrative/SKILL.md
.claude/skills/design-system/SKILL.md
.claude/docs/workflow-catalog.yaml
README.md
UPGRADING.md
```

### Files: Merge Carefully

None — all changes are to infrastructure files with no user content.

---

## v0.4.x → v1.0

**Released:** 2026-03-29
**Commit range:** `6c041ac..HEAD`
**Key themes:** Director gates system, gate intensity modes, Godot C# specialist

### What Changed

| Category | Changes |
|----------|---------|
| **New system** | Director gates — named review checkpoints shared across all workflow skills. Defined in `.claude/docs/director-gates.md` |
| **New feature** | Gate intensity modes: `full` (all director gates), `lean` (phase gates only), `solo` (no directors). Set globally via `production/review-mode.txt` during `/start`, or override per-run with `--review [mode]` on any gate-using skill |
| **New agent** | `godot-csharp-specialist` — C# code quality in Godot 4 projects |
| **Skill updates (13)** | All gate-using skills now parse `--review [full\|lean\|solo]` and include it in their argument-hint: `brainstorm`, `map-systems`, `design-system`, `architecture-decision`, `create-architecture`, `create-epics`, `create-stories`, `sprint-plan`, `milestone-review`, `playtest-report`, `prototype`, `story-done`, `gate-check` |
| **`/start` update** | Added Phase 3b — sets review mode during onboarding, writes `production/review-mode.txt` |
| **`/setup-engine` update** | Language selection step for Godot (GDScript vs C#) |
| **Docs** | `director-gates.md` — full gate catalog; `WORKFLOW-GUIDE.md` — Director Review Modes section; `README.md` — review intensity customization |

---

### Files: Safe to Overwrite

**New files to add:**
```
.claude/agents/godot-csharp-specialist.md
.claude/docs/director-gates.md
```

**Existing files to overwrite (no user content):**
```
.claude/skills/brainstorm/SKILL.md
.claude/skills/map-systems/SKILL.md
.claude/skills/design-system/SKILL.md
.claude/skills/architecture-decision/SKILL.md
.claude/skills/create-architecture/SKILL.md
.claude/skills/create-epics/SKILL.md
.claude/skills/create-stories/SKILL.md
.claude/skills/sprint-plan/SKILL.md
.claude/skills/milestone-review/SKILL.md
.claude/skills/playtest-report/SKILL.md
.claude/skills/prototype/SKILL.md
.claude/skills/story-done/SKILL.md
.claude/skills/gate-check/SKILL.md
.claude/skills/start/SKILL.md
.claude/skills/quick-design/SKILL.md
.claude/skills/setup-engine/SKILL.md
README.md
docs/WORKFLOW-GUIDE.md
UPGRADING.md
```

---

### Files: Merge Carefully

No files require manual merging in this release. All changes are to infrastructure files with no user content.

---

### New Features

#### Director Gates System

All major workflow skills now reference named gate checkpoints defined in
`.claude/docs/director-gates.md`. Gates are identified by domain prefix and name
(e.g., `CD-CONCEPT`, `TD-ARCHITECTURE`, `LP-CODE-REVIEW`). Each gate defines
which director to spawn, what inputs to pass, what verdicts mean, and how
lean/solo modes affect it.

Skills spawn gates using `Task` with the gate ID and documented inputs, rather
than embedding director prompts inline. This keeps skill bodies clean and makes
gate behavior consistent across all workflow phases.

#### Gate Intensity Modes

Three modes let you control how much director review you get:

- **`full`** (default) — all director gates run at every review checkpoint
- **`lean`** — per-skill director reviews are skipped; phase gates at `/gate-check` still run
- **`solo`** — no director gates anywhere; `/gate-check` checks artifact existence only

Set globally during `/start` (writes `production/review-mode.txt`). Override any
individual run with `--review [mode]` on any gate-using skill:

```
/design-system combat --review lean
/gate-check concept --review full
/brainstorm my-game-idea --review solo
```

---

### After Upgrading

1. Run `/start` once to set your preferred review mode — or create `production/review-mode.txt` manually with `full`, `lean`, or `solo`.
2. If you're mid-project, review `.claude/docs/director-gates.md` to understand which gates apply to your current phase.
3. Run `/skill-test static all` to verify all skills pass structural checks.

---

## v0.4.0 → v0.4.1

**Released:** 2026-03-26
**Commit range:** `04ed5d5..HEAD`
**Key themes:** Genre-agnostic agents, new skills, skill fixes

### What Changed

| Category | Changes |
|----------|---------|
| **New skills (1)** | `/consistency-check` — cross-GDD entity consistency scanner |
| **Skill fixes (all team-*)** | Added no-argument guards, formal `Verdict: COMPLETE / BLOCKED` keywords, per-step AskUserQuestion gates, adjacent area dependency checks (team-level), ethics enforcement (team-live-ops), NO-GO path with Phase skip (team-release) |
| **Agent fixes (4)** | Genre-agnostic language in game-designer, systems-designer, economy-designer, live-ops-designer — removed RPG-specific terms |

---

### Files: Safe to Overwrite

**New files to add:**
```
.claude/skills/consistency-check/SKILL.md
```

**Existing files to overwrite (no user content):**
```
.claude/skills/team-combat/SKILL.md      ← no-arg guard, verdict keywords, gate improvements
.claude/skills/team-narrative/SKILL.md   ← no-arg guard, verdict keywords, gate improvements
.claude/skills/team-ui/SKILL.md          ← no-arg guard, verdict keywords, gate improvements
.claude/skills/team-release/SKILL.md     ← no-arg guard, verdict keywords, NO-GO path
.claude/skills/team-polish/SKILL.md      ← no-arg guard, verdict keywords, gate improvements
.claude/skills/team-audio/SKILL.md       ← no-arg guard, verdict keywords, gate improvements
.claude/skills/team-level/SKILL.md       ← no-arg guard, verdict keywords, adjacent area checks
.claude/skills/team-live-ops/SKILL.md    ← no-arg guard, verdict keywords, ethics enforcement
.claude/skills/team-qa/SKILL.md          ← no-arg guard, verdict keywords, gate improvements
.claude/skills/map-systems/SKILL.md      ← verdict keywords
.claude/skills/create-epics/SKILL.md     ← "May I write" protocol fix, verdict keywords
.claude/skills/create-stories/SKILL.md   ← verdict keywords
.claude/agents/game-designer.md          ← genre-agnostic language
.claude/agents/systems-designer.md       ← genre-agnostic language
.claude/agents/economy-designer.md       ← genre-agnostic language
.claude/agents/live-ops-designer.md      ← genre-agnostic language
```

---

### Files: Merge Carefully

No files require manual merging in this release. All changes are to infrastructure files with no user content.

---

### After Upgrading

1. Run `/skill-test catalog` to verify all skills are indexed.
2. Run `/skill-test lint [skill-name]` after any skill edits to check structural compliance.
3. If you've customized any team-* skills, review the updated versions — no-argument guard and `Verdict:` keywords are now required for all team-* skills.

---

## v0.3.0 → v0.4.0

**Released:** 2026-03-21
**Commit range:** `b1cad29..HEAD`
**Key themes:** Full UX/UI pipeline, complete story lifecycle, brownfield adoption, comprehensive QA/testing framework, pipeline integrity, 29 new skills

### What Changed

| Category | Changes |
|----------|---------|
| **New skills (17)** | `/ux-design`, `/ux-review`, `/help`, `/quick-design`, `/review-all-gdds`, `/story-readiness`, `/story-done`, `/sprint-status`, `/adopt`, `/create-architecture`, `/create-control-manifest`, `/create-epics`, `/create-stories`, `/dev-story`, `/propagate-design-change`, `/content-audit`, `/architecture-review` |
| **New skills QA (12)** | `/qa-plan`, `/smoke-check`, `/soak-test`, `/regression-suite`, `/test-setup`, `/test-helpers`, `/test-evidence-review`, `/test-flakiness`, `/skill-test`, `/bug-triage`, `/team-live-ops`, `/team-qa` |
| **New hooks (4)** | `log-agent-stop.sh` — agent audit trail stop; `notify.sh` — Windows toast notifications; `post-compact.sh` — session recovery reminder after compaction; `validate-skill-change.sh` — advises `/skill-test` after skill edits |
| **New templates (8)** | `ux-spec.md`, `hud-design.md`, `accessibility-requirements.md`, `interaction-pattern-library.md`, `player-journey.md`, `difficulty-curve.md`, and 2 adoption plan templates |
| **New infrastructure** | `workflow-catalog.yaml` (7-phase pipeline, read by `/help`), `docs/architecture/tr-registry.yaml` (stable TR-IDs), `production/sprint-status.yaml` schema |
| **Skill updates** | `/gate-check` — 3 gates now require UX artifacts; Pre-Production gate requires vertical slice (HARD gate) |
| **Skill updates** | `/sprint-plan` — writes `sprint-status.yaml`; `/sprint-status` reads it |
| **Skill updates** | `/story-done` — 8-phase completion review, updates story file, surfaces next ready story |
| **Skill updates** | `/design-review` — removed architecture gap check (wrong stage) |
| **Skill updates** | `/team-ui` — full UX pipeline (ux-design → ux-review → team phases) |
| **Agent updates** | 14 specialist agents — `memory: project` added |
| **Agent updates** | `prototyper` — `isolation: worktree` (throwaway work in isolated git branch) |
| **Model routing** | Haiku/Sonnet/Opus tier assignments documented in coordination rules; skills declare their tier in frontmatter |
| **Directory CLAUDE.md** | Scaffolded `design/CLAUDE.md`, `src/CLAUDE.md`, `docs/CLAUDE.md` — path-scoped instructions for each directory |
| **Pipeline integrity** | TR-ID stability, manifest versioning, ADR status gates, TR-ID reference not quote |
| **GDD template** | `## Game Feel` section added (input responsiveness, animation targets, impact moments) |

---

### Files: Safe to Overwrite

**New files to add:**
```
.claude/skills/ux-design/SKILL.md
.claude/skills/ux-review/SKILL.md
.claude/skills/help/SKILL.md
.claude/skills/quick-design/SKILL.md
.claude/skills/review-all-gdds/SKILL.md
.claude/skills/story-readiness/SKILL.md
.claude/skills/story-done/SKILL.md
.claude/skills/sprint-status/SKILL.md
.claude/skills/adopt/SKILL.md
.claude/skills/create-architecture/SKILL.md
.claude/skills/create-control-manifest/SKILL.md
.claude/skills/create-epics/SKILL.md
.claude/skills/create-stories/SKILL.md
.claude/skills/dev-story/SKILL.md
.claude/skills/propagate-design-change/SKILL.md
.claude/skills/content-audit/SKILL.md
.claude/skills/architecture-review/SKILL.md
.claude/skills/qa-plan/SKILL.md
.claude/skills/smoke-check/SKILL.md
.claude/skills/soak-test/SKILL.md
.claude/skills/regression-suite/SKILL.md
.claude/skills/test-setup/SKILL.md
.claude/skills/test-helpers/SKILL.md
.claude/skills/test-evidence-review/SKILL.md
.claude/skills/test-flakiness/SKILL.md
.claude/skills/skill-test/SKILL.md
.claude/skills/bug-triage/SKILL.md
.claude/skills/team-live-ops/SKILL.md
.claude/skills/team-qa/SKILL.md
.claude/hooks/log-agent-stop.sh
.claude/hooks/notify.sh
.claude/hooks/post-compact.sh
.claude/hooks/validate-skill-change.sh
.claude/docs/workflow-catalog.yaml
.claude/docs/templates/ux-spec.md
.claude/docs/templates/hud-design.md
.claude/docs/templates/accessibility-requirements.md
.claude/docs/templates/interaction-pattern-library.md
.claude/docs/templates/player-journey.md
.claude/docs/templates/difficulty-curve.md
design/CLAUDE.md
src/CLAUDE.md
docs/CLAUDE.md
```


> _Truncated; see source file for full content._
