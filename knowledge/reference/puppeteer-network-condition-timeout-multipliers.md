---
version: 0.1.0-draft
name: puppeteer-network-condition-timeout-multipliers
summary: When emulating Puppeteer's predefined network conditions (Fast 4G / Slow 4G / Fast 3G / Slow 3G), scale navigation and wait timeouts by 1x / 2.5x / 5x / 10x respectively to avoid flaky test failures on slower presets.
category: reference
confidence: medium
tags: [puppeteer, network-emulation, timeouts, throttling]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/WaitForHelper.ts
imported_at: 2026-04-18T00:00:00Z
---

# Network-Condition Timeout Multipliers

## Context

Puppeteer's network emulation applies artificial latency and throttling per the `PredefinedNetworkConditions` table. An absolute timeout that passes on Fast 4G often fails on Slow 3G not because something's wrong but because you budgeted too tight.

## The fact / decision / pitfall

The multipliers chrome-devtools-mcp uses when scaling its default 3000ms navigation timeout and stable-DOM wait:

| Preset   | Multiplier |
|----------|------------|
| Fast 4G  | 1x         |
| Slow 4G  | 2.5x       |
| Fast 3G  | 5x         |
| Slow 3G  | 10x        |
| (none)   | 1x         |

Apply as `effectiveTimeout = baseTimeout * multiplier` at timeout construction. CPU throttling (`cpuTimeoutMultiplier`) is a separate, independent multiplier — apply both for tests that emulate both.

## Evidence

- `src/WaitForHelper.ts::getNetworkMultiplierFromString`:
```ts
switch (puppeteerCondition) {
  case 'Fast 4G': return 1;
  case 'Slow 4G': return 2.5;
  case 'Fast 3G': return 5;
  case 'Slow 3G': return 10;
}
```
- `WaitForHelper` constructor multiplies both a CPU and a network base timeout.

## Implications

- If you add custom network conditions (`setNetworkConditions({latency, downloadThroughput, uploadThroughput})`), estimate the multiplier from the download throughput ratio to Fast 4G and apply the same pattern.
- Users configuring CPU throttling (`set_cpu_throttle 4x`) need their navigation timeouts multiplied too; otherwise "click and wait" flakes on underpowered agents or CI runners.
- The multipliers are conservative; 10x for Slow 3G is generous but catches the tail. Don't tighten them without measuring actual p99 page-load times on representative sites.
- Timeouts scaled this way still need an *upper* bound in the caller (e.g. 5 minutes) to catch runaway navigations.
