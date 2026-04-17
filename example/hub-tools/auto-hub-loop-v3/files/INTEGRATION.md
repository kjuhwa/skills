# INTEGRATION.md — wiring v3 modules into `server.js`

> These four files are drop-in modules. Nothing here tries to rewrite
> your orchestration engine — they replace specific, isolated pieces
> of it. Hook them in one at a time; each one gives a standalone win.

## Files

The layout below is what these modules expect — but every path in the
example code uses `__dirname`-relative joins, so the `files/` vs
`prompts/` vs other naming is up to you. What matters is that all
five are reachable from `server.js`.

```
auto-hub-loop/                 ← your project root
  server.js
  hub-loop-v3/
    hub-inventory.js           session-level scan → compressed index + gaps
    theme-strategies.js        per-cycle theme: gap-driven / combinatorial / exploratory
    dedup-gate.js              fuzzy duplicate filter for extracted candidates
    INTEGRATION.md             (this file)
  files/
    extraction.md              novelty-first extraction prompt (allows zero)
```

> If you've already placed `extraction.md` somewhere else, just update
> `EXTRACTION_PROMPT_PATH` in section 4 below.

## Expected impact

| Change                               | Addresses                 | Token/time win (rough) |
|---|---|---|
| Compressed index vs full SKILL.md    | "토큰 많이 듬"            | **10–20× smaller** context per cycle |
| Session-cached gap list              | "새로운 거 얻기 어려움"   | 1 call/session vs 0 calls (new) — cheap |
| Gap-driven + combinatorial themes    | "새로운 거 얻기 어려움"   | ~same cost, **much higher novelty hit rate** |
| Novelty-first extraction prompt      | "억지로 채우는 중복"      | smaller prompt, allows 0-result cycles |
| Code-side dedup gate                 | "중복 프롬프트로 막기"    | removes ~1KB from every prompt, more reliable |

## Where each hooks in

### 1. Session start (once)

Before your loop begins:

```js
const hub   = require('./hub-loop-v3/hub-inventory');
const themes = require('./hub-loop-v3/theme-strategies');
const gate  = require('./hub-loop-v3/dedup-gate');

// HUB_ROOT: wherever you've cloned skills-hub (the directory
// that contains `example/<cat>/<slug>/SKILL.md` etc.)
const HUB_ROOT = process.env.HUB_ROOT || path.resolve('..', 'skills-hub');

const inventory = await hub.load({
  hubRoot: HUB_ROOT,
  claudeBin: 'claude',
});

log.info(`hub: ${inventory.skills.length} skills, ${inventory.knowledge.length} knowledge`);
log.info(`gaps identified: ${inventory.gaps.map(g => g.area).join(', ')}`);
```

If the hub grows during a session and you want to refresh:

```js
hub.invalidate();              // clear cache
const inv2 = await hub.load({...}); // rescan + re-gap
```

### 2. Phase 1 (Generate Ideas) — replace your theme line

Before:
```js
const theme = RANDOM_THEMES[Math.floor(Math.random() * RANDOM_THEMES.length)];
```

After:
```js
const picked = await themes.pick({
  inventory,
  claudeBin: 'claude',
  weights: { gap: 0.6, combo: 0.3, random: 0.1 },
});
const theme = picked.theme;
log.info(`theme (${picked.mode}): ${theme}`);
// keep picked.seeds around — send them to the dashboard Recipe panel
// so users see "this cycle combined X + Y + Z" or "targeting gap: foo"
```

### 3. Generate-Ideas prompt — swap full inventory for compressed index

Before:
```js
const prompt = `...${FULL_HUB_DUMP}... require 100+ citations ...`;
```

After:
```js
const prompt = `...
## Current hub (compressed)
${inventory.indexText}

## Theme
${theme}

Produce 3 apps. Cite 5–15 existing hub items per app where they
genuinely apply — do NOT pad citations. If an item doesn't truly
fit, skip it.
...`;
```

Dropping the "100+ citations" KPI is the single biggest quality
lever. Forced quotas pull Claude away from real novelty.

### 4. Phase 5 (Extract Skills) — use the v3 prompt

```js
// Adjust this path to wherever you dropped extraction.md in your tree.
// In your current layout it's  auto-hub-loop/files/extraction.md , so:
const EXTRACTION_PROMPT_PATH = path.join(__dirname, 'files', 'extraction.md');

const template = fs.readFileSync(EXTRACTION_PROMPT_PATH, 'utf8')
                   .match(/```\n([\s\S]+?)\n```/)[1];

const extractionPrompt = template
  .replace('{{COMPRESSED_INDEX}}', inventory.indexText)
  .replace('{{APPS}}',             appsDigest);  // your existing digest

const raw = await runClaudeWithStdinRedirect(extractionPrompt); // your helper
const parsed = parseExtraction(raw);
// ...use parsed.skills / parsed.knowledge

// Defense-in-depth parser: even with the prompt fixed, Claude occasionally
// strays (returns [], wraps output in ```json fences, prefixes prose, etc.).
// A zero-result cycle MUST NOT crash the pipeline — that defeats the whole
// "quiet skip" design. Treat any unparseable response as "nothing extracted".
function parseExtraction(raw) {
  const empty = { skills: [], knowledge: [] };
  if (!raw || typeof raw !== 'string') return empty;

  // Strip ```json ... ``` fences if present
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  const body = fenced ? fenced[1] : raw;

  // Try to pick the OUTERMOST JSON value — whichever of `{` or `[` comes
  // first in the response. Default-to-object would misgrab the inner {...}
  // from a bare array like  [{...}, {...}]  and fail to parse.
  const objIdx = body.indexOf('{');
  const arrIdx = body.indexOf('[');
  const firstIdx = [objIdx, arrIdx].filter(i => i >= 0).sort((a, b) => a - b)[0];
  if (firstIdx == null) {
    console.warn('[extract] no JSON found in response, treating as empty cycle');
    return empty;
  }
  const preferObject = firstIdx === objIdx;
  const objMatch = body.match(/\{[\s\S]*\}/);
  const arrMatch = body.match(/\[[\s\S]*\]/);
  const candidate = preferObject
    ? (objMatch ? objMatch[0] : (arrMatch ? arrMatch[0] : null))
    : (arrMatch ? arrMatch[0] : (objMatch ? objMatch[0] : null));
  if (!candidate) {
    console.warn('[extract] no JSON found in response, treating as empty cycle');
    return empty;
  }

  let json;
  try { json = JSON.parse(candidate); }
  catch (e) {
    console.warn('[extract] JSON parse failed, treating as empty cycle:', e.message);
    return empty;
  }

  // Normalize both shapes into { skills, knowledge }
  if (Array.isArray(json)) {
    // Bare array fallback — split by "kind" field if present, else assume skills
    const skills    = json.filter(x => !x.kind || x.kind === 'skill');
    const knowledge = json.filter(x => x.kind === 'knowledge');
    return { skills, knowledge };
  }
  return {
    skills:    Array.isArray(json.skills)    ? json.skills    : [],
    knowledge: Array.isArray(json.knowledge) ? json.knowledge : [],
  };
}
```

### 5. After extraction — run the dedup gate

```js
const existing = [...inventory.skills, ...inventory.knowledge];
const skillResult     = gate.filter(parsed.skills     || [], existing);
const knowledgeResult = gate.filter(parsed.knowledge  || [], existing);

log.info(`skills:    ${skillResult.accepted.length} accepted, ${skillResult.review.length} review, ${skillResult.rejected.length} rejected`);
log.info(`knowledge: ${knowledgeResult.accepted.length} accepted, ${knowledgeResult.review.length} review, ${knowledgeResult.rejected.length} rejected`);

// Phase 6 (Publish S/K) — only publish accepted
const toPublish = {
  skills:    skillResult.accepted,
  knowledge: knowledgeResult.accepted,
};

// Broadcast review + rejected to the dashboard for human inspection
sseBroadcast('extraction:review',   skillResult.review.concat(knowledgeResult.review));
sseBroadcast('extraction:rejected', skillResult.rejected.concat(knowledgeResult.rejected));

// If nothing is accepted, skip Phase 6/7 gracefully:
if (!toPublish.skills.length && !toPublish.knowledge.length) {
  log.info('no novel patterns this cycle — skipping publish/install');
  return;  // cycle ends clean, no wasted PR churn
}
```

This last bit is important: **a cycle that produces zero new skills
should be cheap and quiet, not an error.** Right now your pipeline
presumably always publishes something — that's the force-function
pulling in noise. Removing it is where you'll feel the token/time
savings the most.

## Optional — dashboard surface

To make the new behavior visible on `index.html`, add three small things:

1. **Theme mode badge** — next to the theme phrase, show `gap-driven`
   / `combo` / `random` with different colors. Users immediately see
   whether this cycle is exploring or exploiting.
2. **Seeds display** — when `mode=combo`, show the 3 seed skills as
   small chips. When `mode=gap-driven`, show the gap area.
3. **Dedup panel** — beside "Skills acquired", add "Skipped as dup"
   with the similar existing slug. Makes it obvious when the loop
   correctly rejected noise. This is also the `dashboard-decoration-
   vs-evidence` knowledge applied to the new flow.

## Rollout order (recommended)

Wire them in this order — each is useful alone:

1. **`hub-inventory.js` + compressed index** in the generate prompt.
   Immediate token savings with zero behavior change beyond that.
2. **`dedup-gate.js`** after whatever extraction you currently do.
   Immediately see how many "new" skills were actually duplicates.
   The answer will probably explain why novelty felt flat.
3. **v3 extraction prompt** + allow zero-result cycles.
   Stop publishing quota-filler.
4. **`theme-strategies.js`**.
   Now that the pipeline is honest about novelty, bias it toward
   gaps and combinations to actually find it.

## What's NOT in this patch

- Hybrid "harvest from real Claude Code sessions" channel.
  That's a bigger architectural change and should be a separate
  module, not a server.js edit. Happy to design that next if the
  above four changes do less than expected.
- Full-inventory embedding similarity (instead of trigram+token).
  Trigram+token is good enough for a few hundred items and keeps
  the zero-dep promise. If the hub grows past ~2000 items, revisit.
