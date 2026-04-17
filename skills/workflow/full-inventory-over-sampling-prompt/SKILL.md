---
name: full-inventory-over-sampling-prompt
description: When a reference corpus fits comfortably in the LLM context window, pass the full inventory and let the model filter — don't sample arbitrarily
category: workflow
triggers:
  - llm prompt design
  - rag vs full context
  - skill sampling
  - reference corpus prompt
tags:
  - llm
  - prompt-engineering
  - claude-api
  - rag
version: 1.0.0
---

# Full Inventory Over Sampling (When It Fits)

If your LLM has a 200K token context and the reference corpus (skills list, API catalog, style guide, etc.) fits in 100K tokens, **stop sampling**. Pass the whole thing and let the model choose relevance itself. Sampling K items before the LLM sees the problem introduces bias you can't control.

## The anti-pattern

```js
const sampledSkills = sampleRandom(allSkills, 6);  // 6 out of 423
const prompt = `Use these skills to build X: ${sampledSkills.join(', ')}`;
```

Issues:
- **Relevance blind**: the 6 random skills may be entirely unrelated to the task. The LLM applies them anyway, producing weak fits.
- **Repetition**: over many runs, popular samples keep appearing; rare skills never get used.
- **No proof of use**: the system looks like it's leveraging the corpus, but it's really just picking dice-rolls.

## The right pattern

```js
const ALL = getAllSkills();  // 423 entries
const compact = ALL.map(s => `- \`${s.name}\` (${s.category}): ${s.description}`).join('\n');
const prompt = `FULL inventory (${ALL.length} total):
${compact}

Task: build X for theme "...". SCAN the inventory, pick 2–5 skills that GENUINELY fit.
Skip irrelevant ones — don't force-fit.`;
```

The model sees everything, reasons about relevance, and cites only what actually helps. You get:
- Higher quality application (real fit, not forced)
- Better coverage over time (rare relevant skills surface when the task calls for them)
- Verifiable use: log which skills the model cited → prove the corpus is actually being leveraged

## Compact formatting

423 entries × 120 chars (`name + one-line description`) = ~50KB → ~12K tokens. With a 200K window you have 180K+ headroom for the actual task.

Don't include full skill contents. `name + one-line description` is enough for relevance signaling — the model can ask/assume the rest.

## When sampling is still right

- Corpus > 50% of context window → must sample or summarize
- Latency-sensitive paths where even 50KB prompt adds 2-3s roundtrip
- Cost-sensitive loops running thousands of times per hour

For a single orchestrated cycle that runs once, the full dump is almost always cheaper than the QA cost of explaining why the output doesn't cite the right skills.

## Related: verify-cited

Pair this pattern with an extractor that scans the output for known corpus names:

```js
const cited = new Set();
for (const name of allSkillNames) {
  if (new RegExp(`\\b${name}\\b|\`${name}\``).test(output)) cited.add(name);
}
```

Now you can display "4 of 423 skills cited" and know whether the prompt actually did its job.
