---
version: 0.1.0-draft
name: feature-branch-install-stale-content
description: Installing from example/* or skill/* feature branches delivers outdated content — always use main
category: pitfall
source:
  kind: session
  ref: "session-20260417-1945"
confidence: high
linked_skills:
  - hub-install-example
  - hub-install
  - hub-install-all
tags:
  - skills-hub
  - installation
  - feature-branch
  - main-branch
---

**Fact:** Using `example/*` or `skill/*` feature branches as installation sources delivers outdated or unmerged content. Always install from `main` HEAD.

**Why:** Feature branches may contain older versions of files that have since been updated on `main`, include work-in-progress content not yet reviewed, or have `main` merged in but with example files lagging behind canonical versions.

**How to apply:** All `/hub-install*` commands must source exclusively from `main` HEAD. This rule was codified in `bootstrap/v2.4.2` across hub-install-example.md, hub-install.md, and hub-install-all.md.

**Evidence:** Installing `auto-hub-loop` from `origin/example/auto-hub-loop` branch produced files significantly smaller (13KB index.html, 29KB server.js) than the canonical `main` versions (56KB index.html, 52KB server.js).

**Counter / Caveats:** Version-pinned installs use tags that point to commits on `main`, so they are safe. The restriction applies only to feature branches, not tags.
