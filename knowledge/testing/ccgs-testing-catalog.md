---
version: 0.1.0-draft
name: ccgs-testing-catalog
summary: YAML catalog of all CCGS skill tests with their test types and coverage targets
category: testing
confidence: medium
tags: [game-studios, ccgs, testing, catalog, skill-tests, registry]
source_type: extracted-from-git
source_url: https://github.com/Donchitos/Claude-Code-Game-Studios.git
source_ref: main
source_commit: 666e0fcb5ad3f5f0f56e1219e8cf03d44e62a49a
source_project: Claude-Code-Game-Studios
source_path: CCGS Skill Testing Framework/catalog.yaml
imported_at: 2026-04-18T00:00:00Z
---

version: 2
last_updated: ""
skills:
  # Critical — gate skills that control phase transitions
  - name: gate-check
    spec: CCGS Skill Testing Framework/skills/gate/gate-check.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: critical
    category: gate

  - name: design-review
    spec: CCGS Skill Testing Framework/skills/review/design-review.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: critical
    category: review

  - name: story-readiness
    spec: CCGS Skill Testing Framework/skills/readiness/story-readiness.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: critical
    category: readiness

  - name: story-done
    spec: CCGS Skill Testing Framework/skills/readiness/story-done.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: critical
    category: readiness

  - name: review-all-gdds
    spec: CCGS Skill Testing Framework/skills/review/review-all-gdds.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: critical
    category: review

  - name: architecture-review
    spec: CCGS Skill Testing Framework/skills/review/architecture-review.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: critical
    category: review

  # High — pipeline-critical skills
  - name: create-epics
    spec: CCGS Skill Testing Framework/skills/pipeline/create-epics.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: high
    category: pipeline

  - name: create-stories
    spec: CCGS Skill Testing Framework/skills/pipeline/create-stories.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: high
    category: pipeline

  - name: dev-story
    spec: CCGS Skill Testing Framework/skills/pipeline/dev-story.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: high
    category: pipeline

  - name: create-control-manifest
    spec: CCGS Skill Testing Framework/skills/pipeline/create-control-manifest.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: high
    category: pipeline

  - name: propagate-design-change
    spec: CCGS Skill Testing Framework/skills/pipeline/propagate-design-change.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: high
    category: pipeline

  - name: architecture-decision
    spec: CCGS Skill Testing Framework/skills/authoring/architecture-decision.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: high
    category: authoring

  - name: map-systems
    spec: CCGS Skill Testing Framework/skills/pipeline/map-systems.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: high
    category: pipeline

  - name: design-system
    spec: CCGS Skill Testing Framework/skills/authoring/design-system.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: high
    category: authoring

  - name: consistency-check
    spec: CCGS Skill Testing Framework/skills/analysis/consistency-check.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: high
    category: analysis

  # Medium — team and sprint management skills
  - name: sprint-plan
    spec: CCGS Skill Testing Framework/skills/sprint/sprint-plan.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: medium
    category: sprint

  - name: sprint-status
    spec: CCGS Skill Testing Framework/skills/sprint/sprint-status.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: medium
    category: sprint

  - name: team-ui
    spec: CCGS Skill Testing Framework/skills/team/team-ui.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: medium
    category: team

  - name: team-combat
    spec: CCGS Skill Testing Framework/skills/team/team-combat.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: medium
    category: team

  - name: team-narrative
    spec: CCGS Skill Testing Framework/skills/team/team-narrative.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: medium
    category: team

  - name: team-audio
    spec: CCGS Skill Testing Framework/skills/team/team-audio.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: medium
    category: team

  - name: team-level
    spec: CCGS Skill Testing Framework/skills/team/team-level.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: medium
    category: team

  - name: team-polish
    spec: CCGS Skill Testing Framework/skills/team/team-polish.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: medium
    category: team

  - name: team-release
    spec: CCGS Skill Testing Framework/skills/team/team-release.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: medium
    category: team

  - name: team-live-ops
    spec: CCGS Skill Testing Framework/skills/team/team-live-ops.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: medium
    category: team

  - name: team-qa
    spec: CCGS Skill Testing Framework/skills/team/team-qa.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: medium
    category: team

  # Low — analysis, reporting, utility skills
  - name: skill-test
    spec: CCGS Skill Testing Framework/skills/utility/skill-test.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: medium
    category: utility

  - name: skill-improve
    spec: CCGS Skill Testing Framework/skills/utility/skill-improve.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low
    category: utility

  - name: start
    spec: CCGS Skill Testing Framework/skills/utility/start.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low
    category: utility

  - name: help
    spec: CCGS Skill Testing Framework/skills/utility/help.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low
    category: utility

  - name: brainstorm
    spec: CCGS Skill Testing Framework/skills/utility/brainstorm.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low
    category: utility

  - name: project-stage-detect
    spec: CCGS Skill Testing Framework/skills/utility/project-stage-detect.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low
    category: utility

  - name: setup-engine
    spec: CCGS Skill Testing Framework/skills/utility/setup-engine.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low
    category: utility

  - name: quick-design
    spec: CCGS Skill Testing Framework/skills/authoring/quick-design.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low
    category: authoring

  - name: ux-design
    spec: CCGS Skill Testing Framework/skills/authoring/ux-design.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low
    category: authoring

  - name: ux-review
    spec: CCGS Skill Testing Framework/skills/authoring/ux-review.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low
    category: authoring

  - name: art-bible
    spec: CCGS Skill Testing Framework/skills/authoring/art-bible.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low
    category: authoring

  - name: create-architecture
    spec: CCGS Skill Testing Framework/skills/authoring/create-architecture.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low
    category: authoring

  - name: code-review
    spec: CCGS Skill Testing Framework/skills/analysis/code-review.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low
    category: analysis

  - name: balance-check
    spec: CCGS Skill Testing Framework/skills/analysis/balance-check.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low
    category: analysis

  - name: asset-audit
    spec: CCGS Skill Testing Framework/skills/analysis/asset-audit.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low
    category: analysis

  - name: content-audit
    spec: CCGS Skill Testing Framework/skills/analysis/content-audit.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low
    category: analysis

  - name: tech-debt
    spec: CCGS Skill Testing Framework/skills/analysis/tech-debt.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low
    category: analysis

  - name: scope-check
    spec: CCGS Skill Testing Framework/skills/analysis/scope-check.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low
    category: analysis

  - name: estimate
    spec: CCGS Skill Testing Framework/skills/analysis/estimate.md
    last_static: ""
    last_static_result: ""
    last_spec: ""
    last_spec_result: ""
    last_category: ""
    last_category_result: ""
    priority: low

> _Truncated; see source file for full content._
