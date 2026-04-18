---

name: api-versioning-data-simulation
description: Generating realistic fixture data for API version timelines, diffs, and traffic migration curves
category: workflow
triggers:
  - api versioning data simulation
tags: [workflow, api, versioning, data, simulation, migration]
version: 1.0.0
---

# api-versioning-data-simulation

Seed the simulation with a small canonical version ladder (e.g., v1.0, v1.1, v2.0-beta, v2.0, v2.1) and derive every other artifact from it. For each version, generate `releasedAt`, `deprecatedAt` (nullable), `sunsetAt` (nullable), and an endpoint set. Newer versions should *inherit* the previous endpoint set and apply a small change-list (add 1-3, modify 1-2, remove 0-1) so diffs look like real minor/major bumps rather than random noise. Major version bumps should include at least one breaking change; minor bumps should contain only additive changes.

Traffic simulation should follow an S-curve migration model: when a new version releases, its share starts near 0% and grows logistically, while the prior stable version's share decays symmetrically. Add a long tail on deprecated versions (5-15% of traffic lingering for months) to reflect real client inertia — uniform decay looks fake. Inject weekday/weekend seasonality (±20%) and a small amount of per-version noise so stacked charts don't look mechanical.

For the diff fixtures, pre-compute both directions (v1→v2 and v2→v1) and cache by version-pair key, since users flip comparison direction frequently. Store the change-list as structured operations (`{op: 'add'|'remove'|'modify', path, before, after, breaking: bool}`) rather than as pre-rendered diff text — this lets the viewer re-render in unified/split/grouped modes without re-diffing, and lets the timeline badge-count breaking changes cheaply.
