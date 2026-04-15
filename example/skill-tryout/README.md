# skill-tryout

> **Why.** A skill is only useful if it gets discovered. `description` and `triggers` are the only signals Claude uses to route a query, but no one measures how well those signals actually work. This is a browser REPL: paste a sentence, see which skills rank highest via TF-IDF across description + triggers (3× boost) + tags (2× boost) + slug/name. Lets you find skills whose triggers are too narrow, too broad, or worse — entirely absent.

## Run

```bash
# 1. index every SKILL.md in .claude/skills/ (or skills/<cat>/ for the flat hub layout)
node build-tryout.mjs --root=../   # default: parent of this dir

# 2. browse
node serve.mjs   # → http://localhost:4178/
```

## How matching works

- Tokenize query → lowercase, strip stopwords, min length 2.
- Score each skill with TF × IDF across five fields:
  - `description` (1×), `triggers` (3×), `tags` (2×), `slug` + `name` (2×).
- Return top-10 with matched tokens highlighted.

Purely offline — all ranking happens in the browser. Zero dependencies.

## Files

- `build-tryout.mjs` — reads frontmatter, emits `skills.json`
- `serve.mjs` — 25-line static server
- `index.html` — UI + scorer
