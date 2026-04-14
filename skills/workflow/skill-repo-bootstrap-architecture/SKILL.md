---
name: skill-repo-bootstrap-architecture
description: Lay out a shared skill/knowledge git repo so it is simultaneously a catalog and a self-installer — separate bootstrap (commands + umbrella skill + installers) from skills (category/name/SKILL.md). Covers repo layout, safety gates, registry pinning, and skill deprecation lifecycle.
category: workflow
tags: [skill-hub, repo-layout, bootstrap, claude-code, cursor, git, architecture, deprecation]
triggers: [skill repo, skill hub, bootstrap install, category-separated, skills registry, skill deprecation, umbrella skill]
source_project: skills-hub-setup-session
version: 1.0.0
---

# Skill Repo Bootstrap Architecture

See content.md for the layout, safety gates, client-agnostic install pattern, and deprecation lifecycle.

For per-command authoring conventions (frontmatter, dry-run patterns, `## Rules`), see the companion skill `workflow/slash-command-authoring`. This skill covers **repo-level** architecture; that one covers **command-level** authoring.
