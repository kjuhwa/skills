---
version: 0.1.0-draft
name: workflow-guide
summary: End-to-end CCGS development workflow guide covering all phases from concept to release
category: workflow
confidence: medium
tags: [game-studios, ccgs, workflow, phases, development-process]
source_type: extracted-from-git
source_url: https://github.com/Donchitos/Claude-Code-Game-Studios.git
source_ref: main
source_commit: 666e0fcb5ad3f5f0f56e1219e8cf03d44e62a49a
source_project: Claude-Code-Game-Studios
source_path: docs/WORKFLOW-GUIDE.md
imported_at: 2026-04-18T00:00:00Z
---

# Claude Code Game Studios -- Complete Workflow Guide

> **How to go from zero to a shipped game using the Agent Architecture.**
>
> This guide walks you through every phase of game development using the
> 48-agent system, 68 slash commands, and 12 automated hooks. It assumes you
> have Claude Code installed and are working from the project root.
>
> The pipeline has 7 phases. Each phase has a formal gate (`/gate-check`)
> that must pass before you advance. The authoritative phase sequence is
> defined in `.claude/docs/workflow-catalog.yaml` and read by `/help`.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Phase 1: Concept](#phase-1-concept)
3. [Phase 2: Systems Design](#phase-2-systems-design)
4. [Phase 3: Technical Setup](#phase-3-technical-setup)
5. [Phase 4: Pre-Production](#phase-4-pre-production)
6. [Phase 5: Production](#phase-5-production)
7. [Phase 6: Polish](#phase-6-polish)
8. [Phase 7: Release](#phase-7-release)
9. [Cross-Cutting Concerns](#cross-cutting-concerns)
10. [Appendix A: Agent Quick-Reference](#appendix-a-agent-quick-reference)
11. [Appendix B: Slash Command Quick-Reference](#appendix-b-slash-command-quick-reference)
12. [Appendix C: Common Workflows](#appendix-c-common-workflows)

---

## Quick Start

### What You Need

Before you start, make sure you have:

- **Claude Code** installed and working
- **Git** with Git Bash (Windows) or standard terminal (Mac/Linux)
- **jq** (optional but recommended -- hooks fall back to `grep` if missing)
- **Python 3** (optional -- some hooks use it for JSON validation)

### Step 1: Clone and Open

```bash
git clone <repo-url> my-game
cd my-game
```

### Step 2: Run /start

If this is your first session:

```
/start
```

This guided onboarding asks where you are and routes you to the right phase:

- **Path A** -- No idea yet: routes to `/brainstorm`
- **Path B** -- Vague idea: routes to `/brainstorm` with seed
- **Path C** -- Clear concept: routes to `/setup-engine` and `/map-systems`
- **Path D1** -- Existing project, few artifacts: normal flow
- **Path D2** -- Existing project, GDDs/ADRs exist: runs `/project-stage-detect`
  then `/adopt` for brownfield migration

### Step 3: Verify Hooks Are Working

Start a new Claude Code session. You should see output from the
`session-start.sh` hook:

```
=== Claude Code Game Studios -- Session Context ===
Branch: main
Recent commits:
  abc1234 Initial commit
===================================
```

If you see this, hooks are working. If not, check `.claude/settings.json` to
make sure the hook paths are correct for your OS.

### Step 4: Ask for Help Anytime

At any point, run:

```
/help
```

This reads your current phase from `production/stage.txt`, checks which
artifacts exist, and tells you exactly what to do next. It distinguishes
between REQUIRED next steps and OPTIONAL opportunities.

### Step 5: Create Your Directory Structure

Directories are created as needed. The system expects this layout:

```
src/                  # Game source code
  core/               # Engine/framework code
  gameplay/           # Gameplay systems
  ai/                 # AI systems
  networking/         # Multiplayer code
  ui/                 # UI code
  tools/              # Dev tools
assets/               # Game assets
  art/                # Sprites, models, textures
  audio/              # Music, SFX
  vfx/                # Particle effects
  shaders/            # Shader files
  data/               # JSON config/balance data
design/               # Design documents
  gdd/                # Game design documents
  narrative/          # Story, lore, dialogue
  levels/             # Level design documents
  balance/            # Balance spreadsheets and data
  ux/                 # UX specifications
docs/                 # Technical documentation
  architecture/       # Architecture Decision Records
  api/                # API documentation
  postmortems/        # Post-mortems
tests/                # Test suites
prototypes/           # Throwaway prototypes
production/           # Sprint plans, milestones, releases
  sprints/
  milestones/
  releases/
  epics/              # Epic and story files (from /create-epics + /create-stories)
  playtests/          # Playtest reports
  session-state/      # Ephemeral session state (gitignored)
  session-logs/       # Session audit trail (gitignored)
```

> **Tip:** You do not need all of these on day one. Create directories as you
> reach the phase that needs them. The important thing is to follow this
> structure when you do create them, because the **rules system** enforces
> standards based on file paths. Code in `src/gameplay/` gets gameplay rules,
> code in `src/ai/` gets AI rules, and so on.

---

## Phase 1: Concept

### What Happens in This Phase

You go from "no idea" or "vague idea" to a structured game concept document
with defined pillars and a player journey. This is where you figure out
**what** you are making and **why**.

### Phase 1 Pipeline

```
/brainstorm  -->  game-concept.md  -->  /design-review  -->  /setup-engine
     |                                        |                    |
     v                                        v                    v
  10 concepts     Concept doc with       Validation          Engine pinned in
  MDA analysis    pillars, MDA,          of concept          technical-preferences.md
  Player motiv.   core loop, USP         document
                                                                   |
                                                                   v
                                                             /map-systems
                                                                   |
                                                                   v
                                                            systems-index.md
                                                            (all systems, deps,
                                                             priority tiers)
```

### Step 1.1: Brainstorm With /brainstorm

This is your starting point. Run the brainstorm skill:

```
/brainstorm
```

Or with a genre hint:

```
/brainstorm roguelike deckbuilder
```

**What happens:** The brainstorm skill guides you through a collaborative 6-phase
ideation process using professional studio techniques:

1. Asks about your interests, themes, and constraints
2. Generates 10 concept seeds with MDA (Mechanics, Dynamics, Aesthetics) analysis
3. You pick 2-3 favorites for deep analysis
4. Performs player motivation mapping and audience targeting
5. You choose the winning concept
6. Formalizes it into `design/gdd/game-concept.md`

The concept document includes:

- Elevator pitch (one sentence)
- Core fantasy (what the player imagines themselves doing)
- MDA breakdown
- Target audience (Bartle types, demographics)
- Core loop diagram
- Unique selling proposition
- Comparable titles and differentiation
- Game pillars (3-5 non-negotiable design values)
- Anti-pillars (things the game intentionally avoids)

### Step 1.2: Review the Concept (Optional but Recommended)

```
/design-review design/gdd/game-concept.md
```

Validates structure and completeness before you proceed.

### Step 1.3: Choose Your Engine

```
/setup-engine
```

Or with a specific engine:

```
/setup-engine godot 4.6
```

**What /setup-engine does:**

- Populates `.claude/docs/technical-preferences.md` with naming conventions,
  performance budgets, and engine-specific defaults
- Detects knowledge gaps (engine version newer than LLM training data) and
  advises cross-referencing `docs/engine-reference/`
- Creates version-pinned reference docs in `docs/engine-reference/`

**Why this matters:** Once you set the engine, the system knows which
engine-specialist agents to use. If you pick Godot, agents like
`godot-specialist`, `godot-gdscript-specialist`, and `godot-shader-specialist`
become your go-to experts.

### Step 1.4: Decompose Your Concept Into Systems

Before writing individual GDDs, enumerate all the systems your game needs:

```
/map-systems
```

This creates `design/gdd/systems-index.md` -- a master tracking document that:

- Lists every system your game needs (combat, movement, UI, etc.)
- Maps dependencies between systems
- Assigns priority tiers (MVP, Vertical Slice, Alpha, Full Vision)
- Determines design order (Foundation > Core > Feature > Presentation > Polish)

This step is **required** before proceeding to Phase 2. Research from 155 game
postmortems confirms that skipping systems enumeration costs 5-10x more in
production.

### Phase 1 Gate

```
/gate-check concept
```

**Requirements to pass:**

- Engine configured in `technical-preferences.md`
- `design/gdd/game-concept.md` exists with pillars
- `design/gdd/systems-index.md` exists with dependency ordering

**Verdict:** PASS / CONCERNS / FAIL. CONCERNS is passable with acknowledged
risks. FAIL blocks advancement.

---

## Phase 2: Systems Design

### What Happens in This Phase

You create all the design documents that define how your game works. Nothing
gets coded yet -- this is pure design. Each system identified in the systems
index gets its own GDD, authored section by section, reviewed individually,
and then all GDDs are cross-checked for consistency.

### Phase 2 Pipeline

```
/map-systems next  -->  /design-system  -->  /design-review
       |                     |                     |
       v                     v                     v
  Picks next system    Section-by-section     Validates 8
  from systems-index   GDD authoring          required sections
                       (incremental writes)   APPROVED/NEEDS REVISION
       |
       |  (repeat for each MVP system)
       v
/review-all-gdds
       |
       v
  Cross-GDD consistency + design theory review
  PASS / CONCERNS / FAIL
```

### Step 2.1: Author System GDDs

Design each system in dependency order using the guided workflow:

```
/map-systems next
```

This picks the highest-priority undesigned system and hands off to
`/design-system`, which guides you through creating its GDD section by section.

You can also design a specific system directly:

```
/design-system combat-system
```

**What /design-system does:**

1. Reads your game concept, systems index, and any upstream/downstream GDDs
2. Runs a Technical Feasibility Pre-Check (domain mapping + feasibility brief)
3. Walks you through each of the 8 required GDD sections one at a time
4. Each section follows: Context > Questions > Options > Decision > Draft > Approval > Write
5. Each section is written to file immediately after approval (survives crashes)
6. Flags conflicts with existing approved GDDs
7. Routes to specialist agents per category (systems-designer for math,
   economy-designer for economy, narrative-director for story systems)

**The 8 required GDD sections:**

| # | Section | What Goes Here |
|---|---------|---------------|
| 1 | **Overview** | One-paragraph summary of the system |
| 2 | **Player Fantasy** | What the player imagines/feels when using this system |
| 3 | **Detailed Rules** | Unambiguous mechanical rules |
| 4 | **Formulas** | Every calculation, with variable definitions and ranges |
| 5 | **Edge Cases** | What happens in weird situations? Explicitly resolved. |
| 6 | **Dependencies** | What other systems this connects to (bidirectional) |
| 7 | **Tuning Knobs** | Which values designers can safely change, with safe ranges |
| 8 | **Acceptance Criteria** | How do you test that this works? Specific, measurable. |

Plus a **Game Feel** section: feel reference, input responsiveness (ms/frames),
animation feel targets (startup/active/recovery), impact moments, weight profile.

### Step 2.2: Review Each GDD

Before the next system starts, validate the current one:

```
/design-review design/gdd/combat-system.md
```

Checks all 8 sections for completeness, formula clarity, edge case resolution,
bidirectional dependencies, and testable acceptance criteria.

**Verdict:** APPROVED / NEEDS REVISION / MAJOR REVISION. Only APPROVED GDDs
should proceed.

### Step 2.3: Small Changes Without Full GDDs

For tuning changes, small additions, or tweaks that do not warrant a full GDD:

```
/quick-design "add 10% damage bonus for flanking attacks"
```

This creates a lightweight spec in `design/quick-specs/` instead of a full
8-section GDD. Use it for tuning, number changes, and small additions.

### Step 2.4: Cross-GDD Consistency Review

After all MVP system GDDs are approved individually:

```
/review-all-gdds
```

This reads ALL GDDs simultaneously and runs two analysis phases:

**Phase 1 -- Cross-GDD Consistency:**
- Dependency bidirectionality (A references B, does B reference A?)
- Rule contradictions between systems
- Stale references to renamed or removed systems
- Ownership conflicts (two systems claiming the same responsibility)
- Formula range compatibility (does System A's output fit System B's input?)
- Acceptance criteria cross-check

**Phase 2 -- Design Theory (Game Design Holism):**
- Competing progression loops (do two systems fight for the same reward space?)
- Cognitive load (more than 4 active systems at once?)
- Dominant strategies (one approach that makes all others irrelevant)
- Economic loop analysis (sources and sinks balanced?)
- Difficulty curve consistency across systems
- Pillar alignment and anti-pillar violations
- Player fantasy coherence

**Output:** `design/gdd/gdd-cross-review-[date].md` with a verdict.

### Step 2.5: Narrative Design (If Applicable)

If your game has story, lore, or dialogue, this is when you build it:

1. **World-building** -- Use `world-builder` to define factions, history,
   geography, and rules of your world
2. **Story structure** -- Use `narrative-director` to design story arcs,
   character arcs, and narrative beats
3. **Character sheets** -- Use the `narrative-character-sheet.md` template

### Phase 2 Gate

```
/gate-check systems-design
```

**Requirements to pass:**

- All MVP systems in `systems-index.md` have `Status: Approved`
- Each MVP system has a reviewed GDD
- Cross-GDD review report exists (`design/gdd/gdd-cross-review-*.md`)
  with verdict of PASS or CONCERNS (not FAIL)

---

## Phase 3: Technical Setup

### What Happens in This Phase

You make key technical decisions, document them as Architecture Decision Records
(ADRs), validate them through review, and produce a control manifest that
gives programmers flat, actionable rules. You also establish UX foundations.

### Phase 3 Pipeline

```
/create-architecture  -->  /architecture-decision (x N)  -->  /architecture-review
        |                          |                                   |
        v                          v                                   v
  Master architecture       Per-decision ADRs              Validates completeness,
  document covering         in docs/architecture/          dependency ordering,
  all systems               adr-*.md                       engine compatibility
                                                                      |
                                                                      v
                                                         /create-control-manifest
                                                                      |
                                                                      v
                                                         Flat programmer rules
                                                         docs/architecture/
                                                         control-manifest.md
        Also in this phase:
        -------------------
        /ux-design  -->  /ux-review
        Accessibility requirements doc
        Interaction pattern library
```

### Step 3.1: Master Architecture Document

```
/create-architecture
```

Creates the overarching architecture document in `docs/architecture/architecture.md`

> _Truncated; see source file for full content._
