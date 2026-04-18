---
version: 0.1.0-draft
tags: [arch, agent, memory, binding, recall]
name: agent-memory-binding-vs-recall
category: arch
summary: Agent memory systems that ace retrieval benchmarks still fail operationally because stored skills aren't *bound* to the episodes that validated them. Fix is a memory bundle — skill record + episode record + bidirectional link — returned together on recall.
source:
  kind: web-research
  ref: skills_research:trend:2026-04-16
---

# Agent memory: binding, not recall, is the bottleneck

**Fact.** A 500-run benchmark of an agent skill-memory system (OrKa, 250 tasks × 5 tracks) showed: aggregate rubric improvement from skill memory was **+0.06** on a 9.3/10 baseline; **0 of 250** stored skills were actually invoked by the agent despite successful retrieval; retrieved skills oscillated between over-specific paraphrases and vacuous generics ("implement [target]"); only Track C (complex routing, baseline 8.12) saw meaningful lift: **+0.40**. The recall layer worked — the skills were retrievable. They just weren't *bindable* — the retrieved text had no connection to the episodic evidence about when, why, and with what outcome it had been used.

**Why.** Borrowing from cognitive-neuroscience language: the hippocampus doesn't store memories, it stores **bindings** between procedural, episodic, emotional, and semantic records. Agent frameworks that split skills and episodes into separate stores without a relational link reproduce the failure mode — the skill is findable but operationally inert. Memory helps where the model is weak (complex routing); where the model is already strong, extra memory is noise the model correctly ignores.

**How to apply.** Stop evaluating agent memory by retrieval metrics alone (precision@k, MRR) — measure *downstream task lift*; if the skill doesn't change behavior, recall is vanity. Structure memory as *bundles*: a skill record plus one or more episode records plus a bidirectional link. On recall, return both. Schema hint: `skills.episode_ids[]` + `episodes.skill_id`. Include episode outcome, what worked, what failed, causal lessons — not just "skill X was used at time T." Score skill transferability by episode quality + recency — skills must prove continued utility under current conditions to survive. Deploy memory preferentially on hard tasks, not ones the base model already handles.

**Counter / caveats.** Single-author, single-framework (OrKa) study. The binding hypothesis is intuitive but the quantitative claims come from one benchmark. Generalizability to other agent architectures (ReAct, tool-use loops without explicit skill stores) isn't established.

## Sources

- https://dev.to/marcosomma/i-ran-500-more-agent-memory-experiments-the-real-problem-wasnt-recall-it-was-binding-24kc — "I Ran 500 More Agent Memory Experiments..." (2026). Medium confidence; concrete numbers but one researcher's data.
