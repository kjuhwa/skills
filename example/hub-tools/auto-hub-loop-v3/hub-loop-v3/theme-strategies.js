// theme-strategies.js
// -------------------------------------------------------------
// Optional replacement for pure-random theme generation. Provides
// three weighted strategies so most cycles target hub gaps or
// unusual combinations instead of drifting.
//
//   gap-driven    (default 60%) — theme built around a known gap
//   combinatorial (default 30%) — 2–3 seeds from distinct categories
//   exploratory   (default 10%) — original random drift channel
//
// NOT wired into server.js by default — available for opt-in.
// Requires `inventory.gaps` (from hub-inventory with withGaps:true)
// for gap-driven mode.
// -------------------------------------------------------------

const { spawn } = require('child_process');

function callClaude(prompt, { claudeBin = 'claude', timeoutMs = 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(claudeBin, ['-p'], {
      stdio: ['pipe', 'pipe', 'pipe'],
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
  for (let i = cats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cats[i], cats[j]] = [cats[j], cats[i]];
  }
  return cats.slice(0, n).map(c => {
    const bucket = byCat.get(c);
    return bucket[Math.floor(Math.random() * bucket.length)];
  });
}

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
  const seeds = sampleDistinctCategories(pool, 3) || sampleDistinctCategories(pool, 2);
  if (!seeds) throw new Error('not enough category diversity');
  const seedLines = seeds.map(s => `- \`${s.slug}\` [${s.category}] — ${s.purpose}`).join('\n');
  const prompt = `These are existing hub items from DIFFERENT categories:

${seedLines}

Write ONE theme phrase (10–20 words) for a small app whose core
concept meaningfully combines ideas from ALL of the above in a
non-obvious way. The combination should feel surprising but
coherent. Return ONLY the phrase.`;
  const theme = await callClaude(prompt, { claudeBin });
  return { theme: theme.split('\n')[0].trim(), mode: 'combinatorial', seeds };
}

async function exploratory({ claudeBin }) {
  const prompt = `Write ONE evocative theme phrase (10–20 words) for a
small creative app. It can be literary, scientific, whimsical, or
mechanical — but specific. Return ONLY the phrase.`;
  const theme = await callClaude(prompt, { claudeBin });
  return { theme: theme.split('\n')[0].trim(), mode: 'exploratory', seeds: [] };
}

async function pick({ inventory, claudeBin = 'claude', weights } = {}) {
  const w = weights || { gap: 0.6, combo: 0.3, random: 0.1 };
  const tries = ['gap', 'combo', 'random'];
  const chosen = weightedPick(w);
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
