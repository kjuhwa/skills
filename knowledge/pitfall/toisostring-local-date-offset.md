---
version: 0.1.0-draft
name: toisostring-local-date-offset
description: `new Date().toISOString().slice(5, 10)` always formats in UTC; in non-UTC timezones the result is off by one day near midnight. Use `getMonth()+1 / getDate()` for local display.
category: pitfall
tags:
  - date
  - timezone
  - nodejs
  - javascript
---

# toisostring-local-date-offset

In KST (UTC+9), local midnight resolves to 15:00 UTC of the previous day. So `new Date().toISOString().slice(5, 10)` returns the **previous calendar date** from the user's perspective for any time 00:00–08:59 KST. A "today" heatmap cell built this way labels itself with yesterday's date.

## Observed shape

```js
// Wrong: UTC-biased date label
const dayLabel = new Date().toISOString().slice(5, 10); // "04-17" at 00:30 KST of Apr 18

// Right: local-calendar label
const d = new Date();
const dayLabel = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
```

## Extra trap

Server-side the same bug hides in histogram bucket keys:
```js
dayStart.setHours(0, 0, 0, 0);        // local midnight
key = dayStart.toISOString().slice(5, 10);  // ❌ key in UTC
```
Fix by formatting from local getters or by storing the full Date and formatting at render time.

## Why this keeps happening

`toISOString()` is the most idiomatic way to stringify a date. Its UTC bias isn't mentioned in the common one-liner recipe. Linters don't flag it. Only offset users see the bug, and only near midnight — intermittent enough to survive review.

## Rule

If you're rendering a date for a human, never go through ISO. Use locale-aware formatters or local `getFullYear/getMonth/getDate`.
