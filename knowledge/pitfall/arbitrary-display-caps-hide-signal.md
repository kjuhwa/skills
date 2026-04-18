---
version: 0.1.0-draft
name: arbitrary-display-caps-hide-signal
description: Hardcoded `slice(0, N)` display limits in UI code silently cap counts below actual data, making users distrust the pipeline even when it works correctly
category: pitfall
tags:
  - ui
  - dashboards
  - monitoring
  - debugging
---

# Arbitrary Display Caps Hide Signal

## The failure

You build a pipeline that scans 300 items and cites 120 of them. The dashboard renders the list with `slice(0, 20)` because "nobody wants to see 120 items at once." User sees 20, assumes only 20 were cited, and reports: "the system says 120 but only shows 20 — which one is the lie?"

The code isn't lying — the **display layer is lying on the data layer's behalf** by arbitrarily truncating before the user sees the full picture.

## Why it happens

Dashboards grow incrementally. Early in development you test with 5 items and add `slice(0, 20)` as "defense against pathological inputs." Later the real data is 120 items. The slice stays because nobody remembers it's there. The count header says "120 cited" (correct), but the rendered list shows 20 (capped). The user either:

- Assumes the system is broken
- Counts the visible items and concludes the header is wrong
- Loses trust in the whole dashboard

## When caps are legitimate

Caps are fine when:

- The UI is bandwidth-limited (e.g., mobile, embedded display, terminal width)
- There's a visible "Show more / Show all" affordance matching the actual count
- The cap is explicitly tied to what the data layer produced (e.g., "top 10 by relevance" — not "first 10 arbitrarily")
- A companion metric shows the true count prominently (e.g., "Showing 20 of 120 cited")

Caps are **not** fine when:

- The cap was written for a smaller dataset and never revisited
- The cap silently hides items with no UI signal that truncation occurred
- The user's trust model assumes "what I see is what was processed"

## The rule

Before adding `.slice(0, N)` to a render path, ask:

1. Is N tied to something meaningful (screen size, pagination, perf budget)?
2. If the full count exceeds N, is the truncation visible to the user?
3. Would a cautious user, looking at the dashboard alone, be able to tell the list was truncated?

If any answer is no, either remove the cap or add a "Showing N of M" footer. Prefer the former — modern browsers handle thousands of list items without issue, and users almost always want to see all data by default.

## This project

- The Cycle Recipe panel had `slice(0, 20)` on applied skills and `slice(0, 10)` on knowledge, coded early when Claude was citing 2–5 items per cycle
- After raising the prompt to "cite 100+ skills," Claude actually did — 120+ matches in the regex — but the UI kept showing 20
- User immediately noticed: "it says 120 but only shows 20?" — classic symptom
- Fix: raise caps to 200/100 (effectively unbounded for expected input) and rely on browser to handle the rendering
