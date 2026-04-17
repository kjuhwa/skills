# Extraction Prompt (v3)

> Drop this into your Phase 5 (Extract Skills) call. Replaces the
> previous "produce N skills per cycle" prompt with a novelty-first
> one that explicitly allows — and rewards — "nothing new this time".

---

## Template

Use with placeholders: `{{APPS}}`, `{{COMPRESSED_INDEX}}`.
`{{APPS}}` = the diffs / file contents of the 3 apps just built.
`{{COMPRESSED_INDEX}}` = output of `hub-inventory.js` → `indexText`
(one line per existing skill/knowledge, never the full SKILL.md bodies).

```
You are auditing 3 small apps that were just built for reusable
patterns worth adding to a hub of skills and knowledge.

# What's already in the hub

{{COMPRESSED_INDEX}}

# The apps

{{APPS}}

# Your task

Find patterns in the apps that:
  1. would genuinely help a FUTURE unrelated project, AND
  2. are NOT already represented in the hub index above
     (paraphrased versions count as already-represented), AND
  3. are CONCRETE — a specific technique with a named failure
     mode it fixes, not a vague principle.

Most cycles will yield 0–2 such patterns. That is the expected
outcome, not a failure. If nothing meets the bar, return the empty
object form shown in "# Output" below — NOT a bare array.

# Hard rules

- Do NOT produce slugs ending in `-visualization-pattern`,
  `-simulation-pattern`, `-tool-pattern`, `-app-pattern`, or
  `-dashboard-pattern`. These are templated placeholders, not
  patterns.
- Do NOT rename an existing hub item. If your candidate is
  "basically the same idea as X already in the hub", drop it.
- Do NOT invent a pattern to fill quota. Zero is a valid answer.
- A candidate must be describable in ONE sentence with a concrete
  technique AND a concrete problem it solves. If you can't do that,
  it's not ready.

# Output

Return ONLY valid JSON (no prose, no code fences) of shape:

{
  "skills": [
    {
      "slug": "kebab-case-slug",
      "kind": "skill",
      "category": "one-of-existing-categories-or-new-one",
      "purpose": "one sentence, ≤20 words, technique + problem",
      "evidence": "file:lines in the apps where this appears",
      "why_novel": "why the hub index above doesn't already cover it"
    }
  ],
  "knowledge": [
    {
      "slug": "kebab-case-slug",
      "kind": "knowledge",
      "category": "...",
      "purpose": "the insight in one sentence, ≤20 words",
      "evidence": "where in the apps this insight was applied",
      "why_novel": "..."
    }
  ]
}

If nothing qualifies:  {"skills": [], "knowledge": []}
```

---

## Why this prompt is different

| Old prompt                                  | v3                                           |
|---|---|
| "Extract ~5–10 skills per cycle"            | "0 is a valid and expected answer"           |
| Full SKILL.md bodies dumped as context      | One-line compressed index only               |
| Implicit: must produce something            | Explicit: must justify `why_novel`           |
| Dedup enforced via "try to avoid" language  | Dedup enforced downstream by `dedup-gate.js` |
| No fail-fast for vague outputs              | Rejects patterns without concrete technique  |

## Loading and calling

```js
const fs   = require('fs');
const path = require('path');

// Adjust this to wherever you actually dropped extraction.md.
const EXTRACTION_PROMPT_PATH = path.join(__dirname, '..', 'files', 'extraction.md');

const template = fs.readFileSync(EXTRACTION_PROMPT_PATH, 'utf8')
                   .match(/```\n([\s\S]+?)\n```/)[1];

const prompt = template
  .replace('{{COMPRESSED_INDEX}}', inventory.indexText)
  .replace('{{APPS}}', appsDigest);

// then pipe to `claude -p` via your existing stdin-redirect helper
```
