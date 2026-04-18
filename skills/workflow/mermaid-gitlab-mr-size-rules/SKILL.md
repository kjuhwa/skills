---
tags: [workflow, mermaid, gitlab, size, rules]
name: mermaid-gitlab-mr-size-rules
description: Keep Mermaid diagrams in GitLab MRs readable — cap nodes, avoid nested subgraphs, quote IDs with special chars, connect all subgraphs
source_project: lucida-builder-r3
version: 1.0.0
category: workflow
---

# Mermaid for GitLab MRs

## Trigger
- Authoring a merge-request description with embedded Mermaid.
- Reviewing an MR where the diagram renders tiny or unreadable.

## Steps
1. Cap at **10 nodes / 2 subgraphs / 6-step chains / 5–6 sequence participants** per diagram. If you exceed, split into multiple diagrams by concept.
2. **No nested subgraphs.** GitLab shrinks them aggressively.
3. All subgraphs must be connected by at least one edge — isolated subgraphs render tiny.
4. Subgraph IDs: alphanumeric only. Put human labels in brackets: `subgraph AuthModule[auth-module]`. Never put `-`, `/`, or spaces in the ID.
5. Node text: avoid `/`, unescaped quotes. Wrap in `"..."` if the label needs punctuation.
6. Layout choice:
   - Sequential steps (4+): `LR`
   - Branching / parallel / ER: `TB`
   - Before/After compare, state: `LR`
7. Place the diagram inside the "리뷰어를 위한 설명" section of the MR template.

## Pre-merge check
- Preview the rendered MR in GitLab, not just the IDE.
- If any subgraph is unreadable at GitLab's default width, split the diagram.
