# Implementation Reference

## Manifest Template

```json
{
  "slug": "<kebab-case-name>",
  "title": "<Human Readable Title>",
  "summary": "<One sentence describing what it does and why>",
  "stack": ["html", "css", "js"],
  "tags": ["<relevant>", "<tags>"],
  "created_at": "<YYYY-MM-DD>",
  "source_project": "hub-make",
  "runtime": "browser",
  "entrypoint": "index.html",
  "author": "<email>"
}
```

## README Template

```markdown
# <Title>

> **Why.** <One paragraph explaining the gap this fills>

## What it does
<Bullet list of features>

## Stack
Single HTML file, zero external dependencies. Pure HTML + CSS + JS.

## How to run
Open `index.html` in any modern browser.
```

## PR Creation Pattern

```bash
# 1. Branch from main
git checkout -b feat/hub-make-<N>-examples

# 2. Copy artifacts
cp project/index.html example/<slug>/index.html

# 3. Add metadata
# Write manifest.json + README.md

# 4. Commit + push + PR
git add example/<slug>/
git commit -m "Add <N> new examples: <slugs>"
git push -u origin feat/hub-make-<N>-examples
gh pr create --base main --head feat/hub-make-<N>-examples \
  --title "Add <N> new hub-make examples" \
  --body "<summary + test plan>"
```

## TF-IDF Matching (Minimal Implementation)

```javascript
function tokenize(s) {
  return s.toLowerCase().replace(/[^a-z0-9\-\s]/g, '')
    .split(/[\s\-]+/).filter(t => t.length > 2);
}

function tfidf(query, corpus) {
  const qt = tokenize(query);
  if (!qt.length) return [];
  const df = {};
  corpus.forEach(s => {
    const st = new Set(tokenize(s.name + ' ' + s.desc + ' ' + s.category));
    st.forEach(t => { df[t] = (df[t] || 0) + 1 });
  });
  const N = corpus.length;
  return corpus.map(s => {
    const nt = tokenize(s.name), dt = tokenize(s.desc);
    let score = 0;
    qt.forEach(q => {
      const idf = Math.log(N / (1 + (df[q] || 0)));
      score += (nt.filter(t => t.includes(q)).length * 1.5
              + dt.filter(t => t.includes(q)).length * 2) * idf;
    });
    return { ...s, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
}
```
