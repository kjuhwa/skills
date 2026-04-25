---
version: 0.1.0-draft
name: pgvector-pg17-for-ai-native-apps
summary: For AI-native apps that need both relational data and semantic search, use the pgvector/pgvector:pg17 image — one database, no extra infra.
category: devops
tags: [postgres, pgvector, ai, vector-search, docker]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: docker-compose.selfhost.yml
imported_at: 2026-04-18T00:00:00Z
---

Rather than pair a relational DB with a separate vector store (Pinecone, Weaviate, Qdrant), run Postgres with the `pgvector` extension baked in. The `pgvector/pgvector:pg17` image ships Postgres 17 with pgvector pre-installed, so you get:

- One container, one connection pool, one backup story.
- Vector columns (`embedding vector(1536)`) alongside normal columns in the same table.
- Joins between structured filters and similarity search in a single query.
- Standard Postgres tooling (pg_dump, logical replication, SQL migrations).

## Why

For a Linear-scale issue tracker (low millions of rows, not billion-scale) the performance difference vs a dedicated vector store is negligible, and the ops win is large: no extra service to self-host, no extra auth story, no extra network hop. Self-hosters already need Postgres; not asking them to also install a vector DB lowers the barrier.

When the data gets large enough to need a dedicated vector store, you can add one later behind the same query interface; starting with pgvector keeps options open.

## Evidence

- `docker-compose.selfhost.yml:14-29` — `pgvector/pgvector:pg17` service.
- README.md "Architecture" table — Postgres 17 with pgvector as the database tier.
