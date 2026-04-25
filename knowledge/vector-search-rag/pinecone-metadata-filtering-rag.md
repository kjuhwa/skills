---
version: 0.1.0-draft
name: pinecone-metadata-filtering-rag
summary: Structured Pinecone RAG query with $and/$or metadata filters across people/topics/entities/dates, plus a graceful retry-without-filters fallback when the filtered set is empty.
category: vector-search-rag
confidence: high
tags: [pinecone, rag, vector-search, metadata-filtering, openai-embeddings]
source_type: extracted-from-git
source_url: https://github.com/BasedHardware/omi.git
source_ref: main
source_commit: 1c310f7fc4c37acf7e1bedb014e3a4adfd56546e
source_project: omi
imported_at: 2026-04-18T00:00:00Z
---

# Pinecone Metadata-Filtered RAG with Graceful Fallback

Reference pattern for RAG retrieval that combines semantic similarity with structured metadata constraints (time range, named people, topics, entities) — and degrades gracefully when the filter set returns zero matches.

## Filter shape

```python
filter_data = {
  '$and': [
    {'uid': {'$eq': uid}},
    {'$or': [
      {'people':   {'$in': people}},
      {'topics':   {'$in': topics}},
      {'entities': {'$in': entities}},
    ]},
    {'created_at': {'$gte': start_ts, '$lte': end_ts}},
  ]
}
```

Rules:

- Outer `$and` always carries `uid` — multi-tenancy is mandatory, not optional.
- Inner `$or` groups the "soft" filters (any-match is good enough).
- Date range is a separate `$and` clause so it composes with either the presence or absence of soft filters.
- `top_k = 1000` when filter is strict (metadata narrows the set); `top_k = 20` on the fallback (no structured filter → must rank by similarity only).

## Graceful fallback

```
1st query with full filter
   └─ if matches empty AND len(filter_data['$and']) == 3:
        drop filter_data['$and'][1]  (the soft $or block)
        retry with top_k=20
      else:
        return []  # tenant-only filter already tried
```

This is crucial when the user's question implies an entity that was never extracted ("meeting with *Lisa*" but no segment ever tagged `Lisa` in `people`). Without the fallback, the retrieval returns empty and the agent hallucinates.

## Metadata design (upsert side)

```python
metadata = {
  'uid': uid,
  'memory_id': conversation_id,
  'created_at': int(utcnow_ts),  # unix seconds
  'people': [...],
  'topics': [...],
  'entities': [...],
  'people_mentioned': [...],  # superset of people, for soft matches
}
```

- Store timestamps as integer unix seconds; Pinecone filters do numeric comparisons.
- Keep per-vector ID format as `{uid}-{conversation_id}` so single-tenant deletes (`delete_vector(uid, cid)`) are O(1).
- Maintain a single namespace (`ns1`) per environment; use separate indexes for prod vs. staging to avoid cross-contamination.

## Post-ranking

After Pinecone returns, rescore by metadata match count:

```python
match_count = sum(
  (topic in meta['topics']) +
  (entity in meta['entities']) +
  (person in meta['people_mentioned'])
  for topic/entity/person in filters
)
sort conversations by match_count desc
trim to `limit`
```

This compensates for Pinecone's pure-vector ranking when a conversation mentions all three of people+topics+entities — it should outrank one that only matches the vector.

## Evidence in source

- `backend/database/vector_db.py` — `query_vectors_by_metadata()`, `upsert_vector()`, `upsert_vector2()`
- `backend/utils/llm/clients.py` — `OpenAIEmbeddings("text-embedding-3-large")` wiring

## Reusability

Any RAG product with both semantic + structured retrieval (meeting search, document Q&A with tags, CRM-aware chatbots) benefits from the two-tier filter + fallback design. The pattern is index-agnostic — Weaviate, Qdrant, pgvector all support the same `$and`/`$or` shape.
