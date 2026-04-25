---
version: 0.1.0-draft
name: polymorphic-assignees-member-or-agent
summary: An issue's assignee can be a human member OR an AI agent; stored as (assignee_type, assignee_id) tuple and rendered with distinct styling.
category: arch
tags: [domain, assignees, polymorphism, agents, issue-tracker]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

In an AI-native issue tracker, agents are first-class citizens, not decorations. Model it polymorphically:

- `assignee_type` column: `"member" | "agent"`.
- `assignee_id` column: UUID into the matching table.
- Two tables (`members`, `agents`), each with workspace scoping.
- Foreign key validity enforced by application logic (not a DB constraint) because you can't FK on a polymorphic column.

Render them with distinct visual affordances (agents: purple background, robot icon) so a glance at the board tells you which issues a human owns vs which an agent is running.

## Why

The alternative — treating agents as members with a boolean flag — leaks the "agent-ness" into code that only cares about humans (permissions, billing, invite flows) and vice versa. A clean type split keeps those concerns separated. The tradeoff is the UI layer has to dispatch on `assignee_type`, but that's a single component.

Agents also create issues, post comments, change status, and report blockers — anywhere a human member appears in the data model, an agent may too. This is the core design decision of the product.

## Evidence

- CLAUDE.md, "Agent Assignees" section.
- README.md, "Agents as Teammates" feature.
