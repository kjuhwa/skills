---
version: 0.1.0-draft
tags: [decision, typed, wikilinks, for, llm, knowledge]
name: typed-wikilinks-for-llm-knowledge-base
category: decision
summary: Flat `[[wikilinks]]` carry one bit of information. For an LLM-facing knowledge base, tag every link with a relationship type (supersedes, contradicts, causes, supports) so the graph is queryable rather than just traversable.
source:
  kind: web-research
  ref: skills_research:trend:2026-04-16
---

# Typed wikilinks for an LLM knowledge base

**Fact.** In a Karpathy-style LLM wiki (sources → LLM-processed markdown → Obsidian-style graph), plain `[[wikilinks]]` flatten every relationship into an undifferentiated edge — the graph view becomes a hairball and you cannot query "which notes supersede this one?" or "which notes contradict each other?" A practical response is **typed wikilinks**: prefix or tag each link with a relationship type from a small closed vocabulary (~20-30 types: *supersedes, contradicts, causes, supports, depends-on, example-of, refines*, etc.). The syntax (e.g., `[[Note @supersedes previous analysis]]`) gets reflected into YAML frontmatter so it's queryable by scripts and LLM tools. Related gaps: manual relationship discovery doesn't scale past a few hundred notes; no persistent knowledge graph across sessions means every LLM session re-parses the flat index.

**Why.** A knowledge base for LLM consumption has different requirements than a human note vault: humans tolerate browsing, LLMs need retrieval by relation. A typed graph lets you ask structured queries ("every note that contradicts X, created after 2026-01-01") — untyped wikilinks force full-text search instead. When the graph is typed, the LLM can reason about conflicts and supersession rather than emitting outdated and current information side-by-side.

**How to apply.** Define a small, *closed* link-type vocabulary up front — three types used consistently beat thirty used arbitrarily. Pick a syntax that survives plaintext grep (`[[target @type context]]`); avoid anything that requires an editor plugin to be readable. Sync link types into YAML frontmatter so external tools (scripts, MCP servers, vector indexes) can query without parsing wikilink syntax. Treat relationship discovery as an ongoing task, not a one-shot import — a periodic automated + human-approved "vault linker" pass scales better than asking authors to get it right the first time.

**Counter / caveats.** The source is vendor-adjacent (Penfield Labs, which sells a product that solves this). Treat the proposed product as one implementation, not "the" answer; the underlying claims about typed-link benefits stand on their own. For small vaults (<200 notes), untyped wikilinks are usually fine; typed links pay off at a scale bigger than most personal wikis.

## Sources

- https://dev.to/penfieldlabs/what-karpathys-llm-wiki-is-missing-and-how-to-fix-it-1988 — "What Karpathy's LLM Wiki Is Missing (And How to Fix It)" (2026). Medium confidence; single vendor-adjacent source.
