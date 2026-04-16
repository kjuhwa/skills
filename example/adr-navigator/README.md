# Architecture Decision Navigator

> **Why.** `skills-explorer` is skill-centric — it shows patterns. This is knowledge-centric — it shows the *reasoning* behind patterns. Decision records and architecture knowledge explain why things are the way they are, which is what new team members and future maintainers actually need.

## What it does

- 16 entries: 6 decision records + 10 architecture knowledge entries
- Filterable by category (decision / arch) and sortable (A-Z, confidence, category)
- Fuzzy text search across titles, summaries, and body content
- Click-to-expand detail view showing Fact, Why, How to Apply, Counter/Caveats
- Confidence badges (high/medium/low) with colored indicators
- Linked skill chips showing related installed skills
- Stats ribbon with aggregate counts

## Stack

Single HTML file, zero external dependencies. Pure HTML + CSS + JS.

## How to run

Open `index.html` in any modern browser.
