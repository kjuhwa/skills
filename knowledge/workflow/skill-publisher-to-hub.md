---
version: 0.1.0-draft
name: skill-publisher-to-hub
summary: Extract reusable skills from successful genes/capsules and publish to EvoMap Hub
category: workflow
confidence: medium
tags: [evolver, workflow, skill-publishing, hub, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/skillPublisher.js
imported_at: 2026-04-18T00:00:00Z
---

# Publishing skills to the community hub

After an asset has matured locally (high streak, high score, general-purpose), optionally publish it as a community skill.

## Pipeline

1. Scan mature assets for publish candidates (confidence ≥ threshold, general-purpose tag, no project-specific paths).
2. Generate skill template: name, description, category, tags, documentation, tests.
3. Attach source-of-origin metadata so authorship survives.
4. Submit via hub publish API; handle rejection (duplicate / schema violation) and retry with edits.

## Why automate publishing

Human effort is the bottleneck for community libraries; agents that already validated a skill can do the last mile. The network effect compounds: more published skills → faster onboarding → more contributors.

## Reuse notes

The pattern fits any "private learnings → public library" pipeline. The hard part is redaction: ensure skills carry no customer data, secrets, or local paths before publish. A pre-publish redaction lint is worth the cost.
