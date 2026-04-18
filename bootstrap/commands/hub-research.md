---
description: Research skills and knowledge from the web by keyword, or pull current trends when no keyword is given, and stage drafts under .skills-draft/ and .knowledge-draft/
argument-hint: [<keyword>] [--only=skills|knowledge] [--max-skills=<n>] [--max-knowledge=<n>] [--category=<cat>] [--depth=quick|standard|deep] [--sources=<n>] [--lang=en|ko|auto] [--since=<window>] [--trend-source=<source>] [--min-confidence=high|medium|low] [--dry-run] [--yes]
---

# /hub-research $ARGUMENTS

Research the web for reusable engineering knowledge and turn the findings into **skill** and **knowledge** drafts under the current project's `.skills-draft/` and `.knowledge-draft/` trees — using the same layout as `/hub-extract` and `/hub-import`.

Two modes:

- **Keyword mode** — `/hub-research <keyword>` researches that topic.
- **Trend mode** — `/hub-research` (no keyword) surveys current engineering trends and harvests drafts from what's hot.

**No direct installs.** Nothing is written to `~/.claude/skills/`, `.claude/skills/`, `~/.claude/skills-hub/knowledge/`, `.claude/knowledge/`, or `registry.json`. Review drafts, then ship them with `/hub-publish-skills`, `/hub-publish-knowledge`, or `/hub-publish-all`.

## Execution strategy (v2.6.1+)

Bulk scanning MUST be delegated to an `Explore` subagent. The main thread only synthesises drafts from the returned candidate list.

```
Agent(
  subagent_type="Explore",
  description="<short task name>",
  prompt="""
Research the given keyword across authoritative sources (official docs, well-cited blog posts, vendor engineering blogs). Synthesize skill and knowledge candidates with evidence links. Prefer primary sources over aggregators. Mark confidence: high (official docs or multiple independent confirmations) / medium (single reputable source) / low (community forum).

Return a ranked list (top N per `--max-*` flag or sensible default) with: name, kind (skill|knowledge), category, 1-line description, source path(s), confidence. Drop anything project-specific or non-generalizable.
""",
)
```

After the subagent returns, read **only** the few MDs needed to write final drafts. Do **not** iterate `Read` across dozens of files in the main thread — it burns tokens, fragments history, and produces no better result than delegation. (v2.6.1 added this rule after a `/hub-import` run did 73 tool calls to scan one repo.)


## Arguments

- `<keyword>` (optional) — topic, library, pattern, or problem. If omitted, switch to trend mode.
- `--only=skills|knowledge` — restrict output to one kind.
- `--max-skills=<n>` — cap skill drafts (default 5).
- `--max-knowledge=<n>` — cap knowledge drafts (default 10).
- `--category=<cat>` — force all drafts into a single category from `CATEGORIES.md`. Default: auto-classify per draft.
- `--depth=quick|standard|deep` — research intensity. `quick` = 3 sources, `standard` = 6 sources (default), `deep` = 12+ sources with cross-verification.
- `--sources=<n>` — explicit source cap, overrides `--depth`.
- `--lang=en|ko|auto` — preferred source language. Default `auto` (match keyword language; fall back to English).
- `--since=<window>` — recency filter for search (`7d`, `30d`, `6m`, `1y`). Default `6m` for keyword mode, `30d` for trend mode.
- `--trend-source=<source>` — in trend mode, restrict to one channel: `hn` (Hacker News), `gh` (GitHub trending), `arxiv`, `reddit`, `devto`, `blogs`, `all` (default).
- `--min-confidence=high|medium|low` — drop drafts below this (default `medium`).
- `--dry-run` — list what would be staged, change nothing.
- `--yes` — skip the interactive selection step, stage everything above the confidence floor.

## Preconditions

- Must be inside a project directory (not `$HOME`).
- Create `.skills-draft/` and `.knowledge-draft/` if missing; ensure both are in `.gitignore`.
- `WebSearch` and `WebFetch` tools must be available. If not, abort with a clear error — never fabricate sources.

## Pipeline

### 1. Resolve mode & query plan

- **Keyword mode**: treat `<keyword>` as the seed. Build a query plan that expands into 3–6 sub-queries covering: canonical docs, tutorials/how-tos, pitfalls/gotchas, recent changes, benchmarks/comparisons.
- **Trend mode**: build a trend plan per `--trend-source`:
  - `hn` → `WebFetch https://news.ycombinator.com/front` (or front page of the day)
  - `gh` → `WebFetch https://github.com/trending` (optionally `?since=daily|weekly|monthly`)
  - `arxiv` → `WebFetch https://arxiv.org/list/cs.SE/recent` (+ cs.AI, cs.DC as appropriate)
  - `reddit` → top posts of last week in r/programming, r/devops, r/MachineLearning
  - `devto` → `https://dev.to/top/week`
  - `blogs` → aggregated engineering blogs list (Netflix / Uber / Cloudflare / LinkedIn tech blogs) via WebSearch
  - `all` (default) → combine the above, budget ≤ 3 fetches per channel.
- Respect `--since` as a recency cap on every query.
- Respect `--lang`: prefix queries with `site:` hints or language tokens when `ko`; otherwise default English.

### 2. Collect sources (parallel)

- Issue `WebSearch` calls in parallel for the query plan (never more than 6 concurrent).
- For each top hit, `WebFetch` the page and extract the readable content (strip nav, ads, comments).
- Record every source as:
  ```yaml
  - url: <url>
    title: <title>
    published: <iso8601 or "unknown">
    fetched_at: <iso8601>
    fingerprint: sha1(normalized_body)[:10]
  ```
- **Deduplicate by `fingerprint`** to avoid mirror sites.
- Cap total fetched bytes at ~2 MB (truncate large pages to their first 30 KB of body text).
- On fetch error: log the URL and skip — never invent content.

### 3. Classify & draft

For every non-trivial content chunk (heading block, code sample, numbered procedure), emit:

```json
{
  "verdict": "skill" | "knowledge" | "both" | "drop",
  "reason": "...",
  "skill_draft":    { "name": "...", "description": "...", "category": "...", "steps": [...], "example": "..." } | null,
  "knowledge_draft":{ "category": "api|arch|pitfall|decision|domain",
                      "summary": "...", "fact": "...", "evidence": [...], "applies_when": [...], "caveats": [...] } | null,
  "confidence": "high" | "medium" | "low",
  "source_urls": ["<url>", ...]
}
```

Classification rules (identical to `/hub-extract`):

- Executable procedure ("do X by following these steps") → **skill**
- Declarative fact / constraint / decision / lesson → **knowledge**
- Both present → **both** (two files, bidirectionally `linked_*`)
- One-off news, opinion piece with no reusable takeaway, promotional content → **drop**

Web-source-specific rules:

- **≥ 2 independent sources required** for `confidence: high`. Single-source drafts cap at `medium`. Anonymous-blog-only drafts cap at `low`.
- **Contradictions across sources** must be captured under `## Counter / Caveats`, not silently resolved.
- **Paywalled or login-walled snippets** (<200 words of body): downgrade to `low` unless corroborated.
- **Official docs** (vendor/library canonical URL) count as high-signal; prefer them for any `api` knowledge.

### 4. Sanitize

- Strip author names, emails, internal URLs, promotional CTAs.
- Replace brand-specific examples with generic placeholders (`AcmeCorp` → `<org>`, `api.acme.com` → `<api-host>`).
- Keep code samples verbatim **only** if they carry a permissive license or are short (<40 lines). Longer copyrighted blocks: summarize the pattern, link the source.
- Every staged file carries this frontmatter (in addition to its normal fields):
  ```yaml
  source_type: web-research
  source_mode: keyword | trend
  source_query: "<normalized keyword or trend spec>"
  source_urls:
    - <url>
    - <url>
  source_fetched_at: <iso8601>
  ```

### 5. Preview

Unless `--yes`:

```
=== hub-research dry-run ===
Mode: keyword / "kafka exactly-once semantics"
Depth: standard (6 sources fetched, 5 unique after dedupe)

[x] # | kind       | slug                                 | category | conf   | sources
[x] 1 | skill      | kafka-eos-idempotent-producer-setup  | backend  | high   | 3
[x] 2 | knowledge  | eos-read-committed-isolation-limit   | pitfall  | medium | 2
[x] 3 | both       | transactional-outbox-vs-kafka-eos    | arch     | high   | 4
[ ] 4 | drop       | (vendor blog promo, single source)   | -        | low    | 1

Select: [a]ll  [n]one  [i]nvert  numbers to toggle, or 'edit <#>' to open draft
Proceed? [y/N]
```

Trend-mode preview header:

```
=== hub-research dry-run ===
Mode: trend / source=all, since=30d
Channels sampled: hn (3), gh (3), arxiv (2), devto (2)
```

`--dry-run` stops here. `--yes` auto-selects everything above `--min-confidence`.

### 6. Stage as drafts

- **Skill destinations**: `.skills-draft/<category>/<slug>/SKILL.md` (+ `content.md` with research notes, sanitized examples, source list).
- **Knowledge destinations**: `.knowledge-draft/<category>/<slug>.md` using the knowledge template from `/hub-extract`.
- **Both**: write both files, set `linked_knowledge` / `linked_skills` bidirectionally.
- **Slug**: `[a-z0-9-]+`, derive from skill/knowledge name; on collision with existing drafts, diff bodies and prompt `overwrite / skip / rename` — never silently clobber.
- **Category defaults**: use `--category` if supplied, else auto-pick from `CATEGORIES.md`. If no category fits, drop into `uncategorized/` and add a TODO note in the draft.
- **Version**: skill drafts ship as `0.1.0-draft` (matches `/hub-extract`).

### 7. Report

```
Staged:
  skills:     2 (<list of paths>)
  knowledge:  3 (<list of paths>)
  linked:     1 pair (skill ↔ knowledge)
Skipped:      1 (collision, user chose skip)
Dropped:      4 (below min-confidence or promotional)
Sources:      12 fetched, 9 unique

Next:
  • Review: .skills-draft/** and .knowledge-draft/**
  • Publish: /hub-publish-all  (or /hub-publish-skills / /hub-publish-knowledge)
```

Never auto-commit, never push, never install into active skill paths.

## Trend mode notes

- When no keyword is given, the **first** task is to produce a 5–10 item "trend shortlist" from the fetched channels (title + one-line relevance + source URL). Present this shortlist BEFORE drafting, and ask the user whether to draft from (a) all, (b) a subset, or (c) a narrower re-run with a specific keyword.
  - `--yes` auto-picks the top `max(max-skills, max-knowledge)` items.
- Every trend-mode draft's `source_query` field records the trend spec (e.g. `"trend:all:30d:2026-04-16"`), not a fabricated keyword.
- Trend mode never downgrades to keyword mode silently — if the user wants focused research, they must re-run with a keyword.

## Rules

- **Project drafts only.** Never write outside `.skills-draft/` and `.knowledge-draft/` at the project root.
- **Never fabricate sources or citations.** If a search or fetch fails, record the failure and move on — better to return fewer drafts than invented ones.
- **Attribution required.** Every draft must list at least one `source_urls` entry; a draft with zero verifiable sources is a bug.
- **Respect robots / TOS.** Skip URLs that `WebFetch` reports as blocked; do not retry with scraping tricks.
- **No silent clobber** of existing drafts (diff + prompt).
- `--only=knowledge` and `--only=skills` are mutually exclusive with each other (obviously) and skip the other kind entirely — not even `both` verdicts get promoted to the disabled kind.
- `--min-confidence` gate runs AFTER web-source confidence rules (single-source cap, etc.), so `--min-confidence=high` + single-source research → empty result, not a forced promotion.
- Keep fetched bytes reasonable — stop at ~2 MB or `--sources` cap, whichever hits first.
- Convert every relative date in a source (e.g. "last Tuesday") to an absolute ISO date using today's date before writing it into a draft.

## Examples

```
# Keyword research
/hub-research "kafka exactly-once semantics"
/hub-research "rust async cancellation" --depth=deep --max-skills=3
/hub-research "spring boot graceful shutdown" --only=knowledge --min-confidence=high
/hub-research "웹소켓 재연결 전략" --lang=ko --since=1y

# Trend mode
/hub-research                                    # all channels, last 30 days
/hub-research --trend-source=gh --since=7d       # GitHub trending this week
/hub-research --trend-source=arxiv --max-knowledge=5
/hub-research --yes --trend-source=hn            # auto-stage HN front-page patterns

# Dry-run everything before staging
/hub-research "postgres logical replication" --dry-run

# After any run: publish the drafts
/hub-publish-all
```
