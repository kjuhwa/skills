---
name: dashboard-decoration-vs-evidence
description: When designing monitoring dashboards for automation pipelines, prioritize visible evidence of system behavior over decorative animations
category: decision
tags:
  - ui
  - dashboards
  - monitoring
  - automation
---

# Dashboard Decoration vs Evidence of Behavior

## The choice

When building a live dashboard for an automated pipeline (AI agent, build system, data loop), you face a real tension between two kinds of UI real-estate use:

**Decoration**: animated characters, particle effects, glowing badges, "alive" indicators. Makes the dashboard feel engaging and professional at a glance.

**Evidence**: lists of actual artifacts being used, counts of real operations, names of inputs/outputs. Makes the dashboard useful for debugging and trust.

## The failure mode

During this session, the dashboard had an animated pixel-art character with phase-specific animations (thinking pose, working pose, celebrating pose). It looked great. But when the user asked "how do I know the 423 skills in the hub are actually being leveraged?" — the answer was **you can't, from the dashboard**. The character doesn't show you which skills the system cited.

The decoration was actively lying by implication. It suggested "hard work is happening" without proving anything about *what kind* of work.

## The decision

When the pipeline has **invisible internal state** (which skills did the LLM select? which knowledge entries did it respect? which sample was pulled?), the dashboard's primary job is to **render that state visible**. Decoration goes second, after evidence is in place.

We replaced the animated character with a "Cycle Recipe" panel showing:
- The theme (prompt input)
- The skills cited in the generation (actual selection from the corpus)
- The knowledge respected (ditto)
- Pool size scanned (proves full inventory is in the prompt)

This surfaces the previously invisible decision — "the LLM picked these 4 from 423" — which is exactly what the user needed to trust the system.

## When decoration is fine

Decoration is appropriate when:
- All meaningful state is already visible elsewhere
- The system's behavior is so simple there's nothing invisible to reveal
- The dashboard is marketing/demo, not operational

It's **not** fine when:
- The user has asked "is the system actually doing X?" (use evidence)
- Debugging requires understanding which corpus items influenced an output (use evidence)
- The pipeline has non-deterministic choices the user might want to audit (use evidence)

## Application heuristic

**Before adding any animated UI element to a monitoring dashboard, ask:** "Does this animation reveal something that would otherwise be invisible? Or does it just suggest that something is happening?"

If the answer is "it suggests," budget that real-estate for evidence instead.
