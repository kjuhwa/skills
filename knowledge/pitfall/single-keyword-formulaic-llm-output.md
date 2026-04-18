---
version: 0.1.0-draft
name: single-keyword-formulaic-llm-output
description: A single-word theme given to an LLM produces formulaic, generic output — evocative 10–20 word phrases unlock variety
category: pitfall
tags:
  - llm
  - prompt-engineering
  - creativity
  - theme-design
---

# Single-Word Themes Make LLMs Formulaic

## The symptom

You set up an automated generation loop where each cycle picks a random word ("lighthouse", "cartographer", "lantern") and asks the LLM to "build 3 apps about X". After a dozen runs, every output has the same structure:
- `X-visualizer`
- `X-dashboard`
- `X-explorer`

The apps are technically different but feel like reskins. The LLM isn't being creative — it's applying a formula because "X" is just a label.

## Why it happens

A single noun is an **empty signifier** for an LLM. The model has no specific scene, no constraint, no tension. So it falls back on its default pattern for "make 3 creative apps" — which tends to be the same three angles every time.

## The fix

Replace the single word with a **10–20 word evocative phrase** that describes a scene, activity, or tension:

**Before** (formulaic):
```
theme: "lighthouse"
```

**After** (rich):
```
theme: "A weathered lighthouse keeper decodes midnight signals drifting across the stormy ocean horizon while distant foghorns echo forgotten warnings"
```

The phrase carries:
- **Concrete imagery** (weathered, midnight, stormy) — gives the LLM a palette
- **Action/tension** (decodes, drifts, echoes) — suggests UI behaviors
- **Multiple entities** (keeper, signals, foghorns) — seeds different app angles
- **Mood** (forgotten, distant) — biases visual design choices

Output now varies by scene: one app centers on the keeper, another on signal patterns, another on the foghorn timeline. Each run produces genuinely different ideas because the phrase itself is different.

## Constraints

Aim for:
- 10–20 words total (under 10 → too abstract, over 25 → LLM overfits to phrase verbatim)
- Mix of concrete nouns + verbs + sensory adjectives
- No technical jargon ("api", "server", "database" — these re-trigger the formulaic pattern)

## Generation

Have the LLM generate the phrase too, with a diversity constraint:

```
Generate ONE evocative 10-20 word phrase suitable as a creative theme.
Must NOT repeat these recent themes: <last N phrases>
Concrete imagery, mixed verbs + nouns, no tech jargon.
```

The diversity filter alone isn't enough — you need the **length and imagery constraint** for the output to actually vary.

## Related

This is really a special case of "constrain the context to unlock creativity" — vague prompts produce formula, specific prompts produce novelty. The counterintuitive part is that **more constraint** (a phrase with specific imagery) leads to **more variety** across runs.
