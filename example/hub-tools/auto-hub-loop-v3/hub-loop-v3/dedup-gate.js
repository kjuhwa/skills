// dedup-gate.js
// -------------------------------------------------------------
// Zero-dep fuzzy duplicate detector for extracted skill/knowledge
// candidates. Replaces "tell Claude to avoid duplicates in prompt"
// with a code gate — more reliable, no token cost, auditable.
//
// Strategy: three-signal similarity over slug+purpose.
//   - tri : char-trigram Jaccard (typo/suffix robust)
//   - tok : content-word tokens (paraphrase catch)
//   - slug: slug-only tokens (distinctive shared words → near-cert dup)
// Final score = max of the three, so either channel can catch a dup.
//
//   filter(candidates, existing, { accept = 0.30, review = 0.55 })
//     returns { accepted, review, rejected }
//
//   - similarity < accept           -> accepted (genuinely new)
//   - accept ≤ similarity < review  -> review (possibly same)
//   - similarity ≥ review           -> rejected (duplicate)
//
// candidate / existing items: { slug, purpose, category? }
// -------------------------------------------------------------

const STOPWORDS = new Set([
  'the','a','an','and','or','of','to','for','in','on','with','by','is','are',
  'be','that','this','it','as','at','from','via','into','when','during','using',
]);

function normTokens(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t && !STOPWORDS.has(t) && t.length > 1);
}

function trigrams(str) {
  const s = '  ' + String(str || '').toLowerCase().replace(/[^a-z0-9가-힣\s]/g, ' ').replace(/\s+/g, ' ') + '  ';
  const set = new Set();
  for (let i = 0; i < s.length - 2; i++) set.add(s.slice(i, i + 3));
  return set;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function fingerprint(item) {
  const slugPart = (item.slug || '').replace(/-/g, ' ');
  const purposePart = item.purpose || item.description || '';
  const text = slugPart + ' ' + slugPart + ' ' + purposePart;
  return {
    tri:  trigrams(text),
    tok:  new Set(normTokens(slugPart + ' ' + slugPart + ' ' + purposePart)),
    slug: new Set(normTokens(slugPart)),
  };
}

function compare(a, b) {
  return Math.max(
    jaccard(a.tri, b.tri),
    jaccard(a.tok, b.tok),
    jaccard(a.slug, b.slug),
  );
}

const TEMPLATE_SUFFIXES = [
  '-visualization-pattern',
  '-simulation-pattern',
  '-tool-pattern',
  '-app-pattern',
  '-dashboard-pattern',
  '-data-simulation',
  '-implementation-pitfall',
];

function looksTemplated(slug) {
  const s = String(slug || '').toLowerCase();
  return TEMPLATE_SUFFIXES.some(suf => s.endsWith(suf));
}

function scoreAgainst(candidate, existingFingerprints) {
  const f = fingerprint(candidate);
  let best = { score: 0, slug: null };
  for (const [slug, fp] of existingFingerprints) {
    const s = compare(f, fp);
    if (s > best.score) best = { score: s, slug };
  }
  return best;
}

function filter(candidates, existing, opts = {}) {
  const accept = opts.accept ?? 0.30;  // below: genuinely new
  const review = opts.review ?? 0.55;  // above: duplicate

  const existingFp = new Map();
  for (const it of existing) existingFp.set(it.slug, fingerprint(it));

  const accepted = [];
  const forReview = [];
  const rejected = [];
  const seenInBatch = new Map();

  for (const cand of candidates) {
    if (looksTemplated(cand.slug)) {
      rejected.push({ ...cand, reason: 'templated-suffix' });
      continue;
    }
    const vsExisting = scoreAgainst(cand, existingFp);
    const vsBatch    = scoreAgainst(cand, seenInBatch);
    const worst = vsExisting.score >= vsBatch.score ? vsExisting : vsBatch;
    const label = worst === vsExisting ? 'existing' : 'batch';

    if (worst.score >= review) {
      rejected.push({ ...cand, reason: `dup-${label}`, nearest: worst.slug, similarity: +worst.score.toFixed(3) });
    } else if (worst.score >= accept) {
      forReview.push({ ...cand, reason: `similar-${label}`, nearest: worst.slug, similarity: +worst.score.toFixed(3) });
      seenInBatch.set(cand.slug, fingerprint(cand));
    } else {
      accepted.push(cand);
      seenInBatch.set(cand.slug, fingerprint(cand));
    }
  }

  return { accepted, review: forReview, rejected };
}

module.exports = { filter, trigrams, jaccard, fingerprint, compare, looksTemplated };

if (require.main === module) {
  const existing = [
    { slug: 'batch-pr-conflict-recovery', purpose: 'Recover from merge conflicts during batch PR publishing' },
    { slug: 'zero-dep-dark-html-app',     purpose: 'Dashboard scaffold using only vanilla HTML CSS JS' },
    { slug: 'flat-vs-categorized-folder-structure', purpose: 'Choose between flat and categorized folder layouts' },
  ];
  const candidates = [
    { slug: 'pr-batch-conflict-resolution', purpose: 'Resolving merge conflicts when publishing many PRs' },
    { slug: 'physics-spring-simulator',     purpose: 'Simulate spring-mass dynamics with verlet integration' },
    { slug: 'thermal-gradient-visualization-pattern', purpose: 'Visualize heat flow' },
    { slug: 'dark-vanilla-dashboard',       purpose: 'Dashboard built with plain HTML CSS JS no deps' },
  ];
  console.log(JSON.stringify(filter(candidates, existing), null, 2));
}
