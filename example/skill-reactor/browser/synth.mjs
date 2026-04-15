// Deterministic child synthesis shared across multiplier / breeder / reactor.
// Not an LLM — a combinator over names, tags, categories, and description fragments.

const STOP = new Set(['a','an','the','and','or','of','for','to','in','on','with','via','by','from','as','at','is','be','into','per','across','over','under','using','use','this','that','when','where','which','how','why']);

export function words(s) {
  return String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w && !STOP.has(w) && w.length > 2);
}

export function kebab(parts) {
  return [...new Set(parts)].slice(0, 5).join('-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function pick(arr, rnd) { return arr[Math.floor(rnd() * arr.length)]; }

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function weightedPair(pool, rnd) {
  if (pool.length < 2) return null;
  const a = pool[Math.floor(rnd() * pool.length)];
  const aTags = new Set([a.category, ...(a.tags || [])]);
  let best = null, bestScore = -1;
  const sample = Math.min(16, pool.length);
  for (let i = 0; i < sample; i++) {
    const cand = pool[Math.floor(rnd() * pool.length)];
    if (cand.id === a.id) continue;
    let score = 0;
    if (cand.category === a.category) score += 2;
    for (const t of (cand.tags || [])) if (aTags.has(t)) score += 1;
    score += rnd() * 0.5;
    if (score > bestScore) { bestScore = score; best = cand; }
  }
  return best ? [a, best] : null;
}

export function allTags(pool) {
  const m = new Map();
  for (const e of pool) for (const t of (e.tags || [])) m.set(t, (m.get(t) || 0) + 1);
  return [...m.keys()];
}

export function synth(a, b, gen, rnd, opts = {}) {
  const mutationRate = opts.mutationRate ?? 0.15;
  const tagPool = opts.tagPool || [];
  const aw = words(a.name || a.id);
  const bw = words(b.name || b.id);
  const nameBits = [aw[0], bw[Math.min(1, bw.length - 1)], aw[1] || bw[0]].filter(Boolean);
  let slug = kebab([...nameBits, 'g' + gen]);
  if (!slug) slug = 'synth-g' + gen + '-' + Math.floor(rnd() * 1e6).toString(36);
  const tags = [...new Set([...(a.tags || []).slice(0, 3), ...(b.tags || []).slice(0, 3)])];
  if (rnd() < mutationRate && tagPool.length) tags.push(pick(tagPool, rnd));
  const category = rnd() < 0.5 ? (a.category || 'hybrid') : (b.category || 'hybrid');
  const title = titleCase(nameBits.join(' ')) || slug;
  const descA = firstSentence(a.description || a.summary || a.body);
  const descB = firstSentence(b.description || b.summary || b.body);
  const description = squash(`${descA} Combined with: ${descB}`);
  const body = [
    `# ${title}`,
    '',
    `> Generation ${gen} synthesis of \`${a.id}\` \u00d7 \`${b.id}\`.`,
    '',
    '## Trigger',
    description,
    '',
    '## Parents',
    `- **${a.name || a.id}** (${a.type || 'entry'}, ${a.category || '?'})`,
    `  - ${descA}`,
    `- **${b.name || b.id}** (${b.type || 'entry'}, ${b.category || '?'})`,
    `  - ${descB}`,
    '',
    '## Inherited tags',
    tags.map(t => `- ${t}`).join('\n') || '- (none)',
  ].join('\n');
  return {
    id: slug,
    type: 'skill',
    name: title,
    description,
    category,
    tags,
    gen,
    parents: [a.id, b.id],
    body,
    source_project: 'synthesized',
  };
}

function titleCase(s) {
  return String(s || '').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function firstSentence(s) {
  const raw = String(s || '').replace(/[#>`*_]/g, ' ').replace(/\s+/g, ' ').trim();
  const m = raw.match(/^[^.!?]{10,220}[.!?]/);
  return (m ? m[0] : raw.slice(0, 180)).trim();
}

function squash(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 320);
}
