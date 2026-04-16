# Skill Cookbook

> **Why.** `skill-tryout` tests routing of *one* skill at a time. Cookbook answers "which skills work *together*?" — the combinatorial view that was missing. Instead of browsing 240 skills individually, describe your problem and get a ready-made recipe.

## What it does

- Natural language search: "JWT token refresh without race conditions", "propagate tenant context through Kafka"
- TF-IDF matching engine across 55 embedded skills (name 1.5x, description 2x, category 0.5x weighting)
- Generates 2-3 recipe cards per query: primary solution, alternative approach, extended + safety
- 6 pre-built popular recipes shown on empty state (Multi-tenant Kafka Pipeline, Secure JWT Flow, etc.)
- Category-colored skill chips (backend/frontend/arch/ai/devops)
- Relevance score bars per recipe
- Search-as-you-type with debounce

## Stack

Single HTML file, zero external dependencies. Pure HTML + CSS + JS.

## How to run

Open `index.html` in any modern browser.
