---
name: github-trending-zero-dep-scraper
description: Scrape https://github.com/trending for the daily/weekly/monthly top repos using only Node's built-in `https` module — no cheerio, no puppeteer, no fetch polyfill. Parse the `<article class="Box-row">` blocks with targeted regex and return a clean list of {owner, repo, language, starsToday}.
category: integration
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [github, trending, scraper, html, zero-dep, nodejs, https]
source_type: extracted-from-project
source_project: trending-hub-loop
imported_at: 2026-04-18T00:00:00Z
---

# GitHub Trending Zero-Dep Scraper

## When to use

You want a periodically-refreshed list of what's trending on GitHub for ingestion into another pipeline (issue triage, codegen corpus, research queue) and you want to keep the dependency surface at zero.

## Why no HTML parser

The GitHub Trending page has **stable, named class attributes** on the structural elements you care about. A few tight regexes on the raw HTML get you past 99% of the problem. Pulling in `cheerio` (250KB) or `jsdom` (10MB+) to find `.Box-row` is overkill and adds a surface for supply-chain drift.

If GitHub ever moves to a fully client-rendered Trending page, this approach breaks — at which point you graduate to the authenticated REST search endpoint (`/search/repositories?q=stars:>N&sort=stars&order=desc`) rather than scraping JS-rendered HTML.

## Request shape

```js
https.request({
  host: 'github.com',
  path: lang ? `/trending/${encodeURIComponent(lang)}?since=${since}` : `/trending?since=${since}`,
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (your-tool-name; +https://your-url)',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9',
  },
  timeout: 30000,
}, handler);
```

- `since` ∈ {`daily`, `weekly`, `monthly`} — the dropdown on the Trending page.
- `language` is URL-path, not a query param.
- The `User-Agent` must be non-empty or GitHub 403s. Identify your tool honestly; don't spoof a browser string.
- Handle `301`/`302` as errors — GitHub redirects to login if you hit it anonymously from some IP ranges.

## Parse shape

```js
// Each trending repo is wrapped in <article class="Box-row">...</article>.
const articleRegex = /<article[^>]*class="[^"]*Box-row[^"]*"[^>]*>([\s\S]*?)<\/article>/g;

for (const block of html.matchAll(articleRegex).map(m => m[1])) {
  // owner/repo from the <h2>…<a href="/owner/repo">
  const href = block.match(/<h2[^>]*>[\s\S]*?<a[^>]+href="\/([^"\/]+)\/([^"\/]+)"/);
  // description
  const desc = block.match(/<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/);
  // language
  const lang = block.match(/<span itemprop="programmingLanguage">([^<]+)<\/span>/);
  // stars today
  const stars = block.match(/<span[^>]*class="[^"]*d-inline-block[^"]*float-sm-right[^"]*"[^>]*>([\s\S]*?)<\/span>/);
  // ... dedupe by `owner/repo`, strip tags, collapse whitespace
}
```

## Rules

- **Always dedupe.** The trending page sometimes lists the same repo twice (featured + category). Keep a `Set` keyed on `owner/repo` and skip dupes.
- **Strip tags + collapse whitespace on text fields.** Description and stars-today contain nested `<svg>`, `<path>`, and decorative spans. `.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()` is sufficient.
- **Treat language as optional.** Not every trending repo has a detectable primary language (Markdown-only repos, multi-lang tools). Default to empty string, don't drop the row.
- **Set a request timeout.** 30s is a safe default; the page is small but rate-limited paths can hang. Destroy the socket on timeout, don't leak fds.
- **CLI shape.** `if (require.main === module)` → run with argv so the scraper doubles as a quick smoke-test (`node trending.js python daily`). Keeps the module testable without a test harness.
- **Export both levels.** Export `fetchTrending` (convenience), `fetchTrendingHtml` (raw HTML for tests), and `parseTrendingRepos` (pure parse for snapshot testing). This layering means you can unit-test the regex against a saved HTML fixture without network.

## Counter / Caveats

- **Class names are GitHub's UI, not an API.** They *have* been stable for years, but any major redesign will invalidate the regexes. Pin a saved HTML fixture to a regression test so you notice on the next run rather than silently getting 0 repos.
- **Regex on HTML is famously brittle.** This is only OK because the Trending page has no nested `<article>` or `<h2>` inside the Box-row blocks. If you start parsing issue bodies or READMEs, stop and reach for a real parser.
- **Anonymous scraping has rate limits.** Not rigid for the Trending HTML page, but heavy polling gets you CAPTCHA'd or redirected. Cap at 1 request every few minutes per `since` flavor.
- **No guarantee of star counts.** The "stars today" string is formatted for humans ("1,234 stars today"). Don't try to parse it as a number unless you really need to — it's already a display string.

## Related

- Knowledge: none direct; this skill is self-contained.
- Alternative: REST API `/search/repositories?sort=stars&order=desc` with a date filter — authenticated, no rate-limit surprises, but requires a token and misses the "stars today" framing.
