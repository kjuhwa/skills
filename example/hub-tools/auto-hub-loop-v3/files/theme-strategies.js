// theme-strategies.js
// -------------------------------------------------------------
// Replaces pure random theme generation with THREE strategies,
// weighted so most cycles target real gaps or explore unusual
// combinations instead of drifting randomly.
//
//   gap-driven    (default 60%) — theme built around a hub gap
//   combinatorial (default 30%) — theme combining 2–3 existing
//                                  skills from different categories
//   exploratory   (default 10%) — your original random-theme mode,
//                                  kept as a drift channel
//
// Each strategy calls Claude ONCE with a tiny prompt (no full
// inventory — just the specific seeds), so per-cycle token cost
// is a fraction of the current approach.
//
// Usage:
//   const themes = require('./theme-strategies');
//   const { theme, mode, seeds } = await themes.pick({
//     inventory, claudeBin, weights: { gap: 0.6, combo: 0.3, random: 0.1 }
//   });
// -------------------------------------------------------------

const { spawn } = require('child_process');

function callClaude(prompt, { claudeBin = 'claude', timeoutMs = 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(claudeBin, ['-p'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      // See hub-inventory.js for why shell:true on win32.
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        DISABLE_OMC: '1',
        OMC_SKIP_HOOKS: '*',
        CLAUDE_DISABLE_SESSION_HOOKS: '1',
      },
    });
    const kill = setTimeout(() => proc.kill('SIGKILL'), timeoutMs);
    let out = '', err = '';
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => err += d);
    proc.on('close', code => {
      clearTimeout(kill);
      if (code !== 0) return reject(new Error(`claude exit ${code}: ${err.slice(0, 300)}`));
      resolve(out.trim());
    });
    proc.stdin.end(prompt);
  });
}

function weightedPick(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  let r = Math.random() * total;
  for (const [k, v] of entries) {
    r -= v;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

function sampleDistinctCategories(items, n) {
  const byCat = new Map();
  for (const it of items) {
    if (!byCat.has(it.category)) byCat.set(it.category, []);
    byCat.get(it.category).push(it);
  }
  const cats = [...byCat.keys()];
  if (cats.length < n) return null;
  // shuffle cats
  for (let i = cats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cats[i], cats[j]] = [cats[j], cats[i]];
  }
  const chosen = cats.slice(0, n);
  return chosen.map(c => {
    const bucket = byCat.get(c);
    return bucket[Math.floor(Math.random() * bucket.length)];
  });
}

// ---------- strategies ----------

async function gapDriven({ inventory, claudeBin }) {
  const gaps = inventory.gaps || [];
  if (!gaps.length) throw new Error('no gaps available');
  const gap = gaps[Math.floor(Math.random() * gaps.length)];
  const prompt = `Write ONE theme phrase (10–20 words) for a small app
that would naturally explore this underdeveloped area of the hub:

AREA: ${gap.area}
WHY IT'S A GAP: ${gap.reason}

The theme should be evocative and specific — not a category name.
It should hint at 1–2 concrete mechanisms or metaphors. Return ONLY
the phrase, no quotes, no preface.`;
  const theme = await callClaude(prompt, { claudeBin });
  return { theme: theme.split('\n')[0].trim(), mode: 'gap-driven', seeds: [gap] };
}

async function combinatorial({ inventory, claudeBin }) {
  const pool = [...(inventory.skills || []), ...(inventory.knowledge || [])];
  if (pool.length === 0) {
    throw new Error('combinatorial: hub pool empty');
  }

  // Try for diversity: 3 different categories → 2 → 1. If even 1 fails
  // (because there's literally one item or all items share one cat AND
  // one item), fall back to two random items same-category.
  let seeds = sampleDistinctCategories(pool, 3)
           || sampleDistinctCategories(pool, 2)
           || sampleDistinctCategories(pool, 1);
  let mode = 'combinatorial';

  if (!seeds || seeds.length < 2) {
    // Single-item "extend this pattern" variant — still useful signal
    if (pool.length === 1) {
      seeds = [pool[0]];
      mode = 'combinatorial-extend';
    } else {
      // Pool has ≥2 items but they all share one category — mix two of them
      const a = pool[Math.floor(Math.random() * pool.length)];
      let b;
      do { b = pool[Math.floor(Math.random() * pool.length)]; }
      while (b === a);
      seeds = [a, b];
      mode = 'combinatorial-same-cat';
    }
  }

  const seedLines = seeds.map(s => `- \`${s.slug}\` [${s.category}] — ${s.purpose}`).join('\n');
  const intro = seeds.length === 1
    ? 'This is an existing hub item:'
    : `These are existing hub items${mode === 'combinatorial' ? ' from DIFFERENT categories' : ''}:`;
  const task = seeds.length === 1
    ? `Write ONE theme phrase (10–20 words) for a small app that takes
this pattern and applies it in an unfamiliar domain — somewhere the
original author probably didn't consider. Return ONLY the phrase.`
    : `Write ONE theme phrase (10–20 words) for a small app whose core
concept meaningfully combines ideas from ALL of the above in a
non-obvious way. The combination should feel surprising but
coherent. Return ONLY the phrase.`;

  const prompt = `${intro}\n\n${seedLines}\n\n${task}`;
  const theme = await callClaude(prompt, { claudeBin });
  return { theme: theme.split('\n')[0].trim(), mode, seeds };
}

async function exploratory({ claudeBin }) {
  const prompt = `Write ONE evocative theme phrase (10–20 words) for a
small creative app. It can be literary, scientific, whimsical, or
mechanical — but specific. Return ONLY the phrase.`;
  const theme = await callClaude(prompt, { claudeBin });
  return { theme: theme.split('\n')[0].trim(), mode: 'exploratory', seeds: [] };
}

// ---------- public ----------

async function pick({ inventory, claudeBin = 'claude', weights } = {}) {
  const w = weights || { gap: 0.6, combo: 0.3, random: 0.1 };
  const tries = ['gap', 'combo', 'random'];
  let chosen = weightedPick(w);
  // put chosen first, then fall back to the others if it fails
  const order = [chosen, ...tries.filter(t => t !== chosen)];
  let lastErr;
  for (const mode of order) {
    try {
      if (mode === 'gap')    return await gapDriven({ inventory, claudeBin });
      if (mode === 'combo')  return await combinatorial({ inventory, claudeBin });
      if (mode === 'random') return await exploratory({ claudeBin });
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('all theme strategies failed');
}

module.exports = { pick, gapDriven, combinatorial, exploratory };
