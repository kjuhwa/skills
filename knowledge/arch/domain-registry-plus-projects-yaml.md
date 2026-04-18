---
version: 0.1.0-draft
name: domain-registry-plus-projects-yaml
description: Central domain registry + per-user path map for multi-repo codegen
category: arch
source:
  kind: project
  ref: polestar10-auto-pipeline@b0f1c9d
confidence: medium
linked_skills: []
tags: [multi-repo, codegen, routing, registry, local-config]
---

**Fact:** Multi-repo codegen needs two independent pieces of routing info:
1. **Domain classification** — which backend domain owns this feature (stable, shared across team). Kept in a central wiki/registry with domain → keyword mappings so the AI can infer from planning-doc vocabulary.
2. **Repo paths** — where each domain's clone lives on this developer's machine (volatile, per-developer). Kept in a git-ignored local file (e.g. `projects.yaml`) keyed by domain.

Passing path as CLI flag (`--project-path=...`) was rejected because it breaks natural-language invocation and can't be inferred from a planning doc.

**Why:** Mixing the two ends up with per-developer forks of the shared registry, or path strings baked into shared docs. Separating them lets the team own the domain map while each developer owns their layout. The AI auto-matches keywords against the shared registry, then looks up the local path.

**How to apply:**
- When building a codegen tool that spans repos: publish the domain taxonomy centrally (wiki/shared file), ship a `*.yaml.example` template, git-ignore the real per-developer config.
- Always surface the inferred domain to the developer for confirmation before generating — keyword matching isn't reliable enough to skip the prompt.
- Key both files by the same domain slug so one join resolves "keyword in planning doc → repo path on disk".

**Evidence:**
- Internal design-decisions doc §4 — initial `--project-path` flag rejected, registry+yaml adopted.
- Internal planning-doc-requirements doc §5 — central domain-registry wiki page as source of truth.
- Repo root `projects.yaml.example` with `domains.{slug}.project_path` + `keywords`.
