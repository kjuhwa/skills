// hub-inventory.js (adapted for auto-hub-loop)
// -------------------------------------------------------------
// Scans the skills-hub remote and produces a COMPRESSED one-line
// index (slug + category + ≤20-word purpose) plus raw item arrays.
//
// Hub layout in this project:
//   <hubRoot>/skills/<category>/<slug>/SKILL.md
//   <hubRoot>/knowledge/<category>/<slug>.md        (flat per-category)
//
// Purpose derivation order:
//   1. YAML frontmatter `description:` field (primary — already curated)
//   2. First prose sentence after stripping headers/fences
//
// Usage:
//   const hub = require('./hub-loop-v3/hub-inventory');
//   const inv = await hub.load({ hubRoot });
//   // inv.indexText  — compressed one-line-per-item index for prompts
//   // inv.skills     — [{ slug, category, purpose, description, path }]
//   // inv.knowledge  — [{ slug, category, purpose, description, path }]
//   // inv.gaps       — [{ area, reason }] (only when withGaps:true)
// -------------------------------------------------------------

const fs   = require('fs');
const fsp  = require('fs/promises');
const path = require('path');
const os   = require('os');
const { spawn } = require('child_process');

const CACHE_DIR  = path.join(os.homedir(), '.cache', 'hub-loop-v3');
const CACHE_FILE = path.join(CACHE_DIR, 'inventory.json');

async function ensureDir(p) { await fsp.mkdir(p, { recursive: true }); }

function frontmatterField(md, field) {
  const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return '';
  const re = new RegExp(`^${field}:\\s*(.+)$`, 'm');
  const m = fm[1].match(re);
  return (m?.[1] || '').trim().replace(/^["']|["']$/g, '');
}

function firstProse(md, maxWords = 20) {
  const stripped = md
    .replace(/^---[\s\S]*?---/, '')
    .replace(/^#.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sent = stripped.split(/(?<=[.!?。])\s/)[0] || stripped;
  return sent.split(/\s+/).slice(0, maxWords).join(' ').replace(/[.,;:]$/, '');
}

function derivePurpose(md, maxWords = 20) {
  const desc = frontmatterField(md, 'description');
  if (desc) {
    const words = desc.split(/\s+/).slice(0, maxWords);
    return words.join(' ').replace(/[.,;:]$/, '');
  }
  return firstProse(md, maxWords);
}

async function safeReaddir(dir) {
  try { return await fsp.readdir(dir, { withFileTypes: true }); }
  catch { return []; }
}

async function scanSkills(hubRoot) {
  const root = path.join(hubRoot, 'skills');
  if (!fs.existsSync(root)) return [];
  const items = [];
  for (const catEnt of await safeReaddir(root)) {
    if (!catEnt.isDirectory()) continue;
    const catPath = path.join(root, catEnt.name);
    for (const slugEnt of await safeReaddir(catPath)) {
      if (!slugEnt.isDirectory()) continue;
      const skillFile = path.join(catPath, slugEnt.name, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;
      let body = '';
      try { body = await fsp.readFile(skillFile, 'utf8'); } catch { continue; }
      items.push({
        slug: slugEnt.name,
        category: catEnt.name,
        description: frontmatterField(body, 'description'),
        purpose: derivePurpose(body),
        path: skillFile,
      });
    }
  }
  items.sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug));
  return items;
}

async function scanKnowledge(hubRoot) {
  const root = path.join(hubRoot, 'knowledge');
  if (!fs.existsSync(root)) return [];
  const items = [];
  for (const catEnt of await safeReaddir(root)) {
    if (!catEnt.isDirectory()) continue;
    const catPath = path.join(root, catEnt.name);
    for (const fEnt of await safeReaddir(catPath)) {
      if (!fEnt.isFile() || !fEnt.name.endsWith('.md')) continue;
      const full = path.join(catPath, fEnt.name);
      let body = '';
      try { body = await fsp.readFile(full, 'utf8'); } catch { continue; }
      items.push({
        slug: fEnt.name.replace(/\.md$/, ''),
        category: catEnt.name,
        description: frontmatterField(body, 'description'),
        purpose: derivePurpose(body),
        path: full,
      });
    }
  }
  items.sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug));
  return items;
}

function buildIndexText(skills, knowledge) {
  const lines = [];
  lines.push(`## Skills (${skills.length})`);
  for (const s of skills) lines.push(`- \`${s.slug}\` [${s.category}] — ${s.purpose}`);
  lines.push('');
  lines.push(`## Knowledge (${knowledge.length})`);
  for (const k of knowledge) lines.push(`- \`${k.slug}\` [${k.category}] — ${k.purpose}`);
  return lines.join('\n');
}

// Optional gap-analysis Claude call. Skipped unless caller asks.
async function askClaudeForGaps({ indexText, claudeBin }) {
  const prompt = `Below is the current hub inventory (compressed).

${indexText}

Task: identify 8–12 DOMAINS or CAPABILITY AREAS that are clearly
underdeveloped or completely absent. Ignore anything already well-
covered. Do NOT invent areas that overlap existing items.

Return ONLY valid JSON (no prose, no fences) of shape:
[{"area": "short name", "reason": "≤20 words why it's a gap"}]
`;
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
    let out = '', err = '';
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => err += d);
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`claude exit ${code}: ${err.slice(0, 300)}`));
      try {
        const m = out.match(/\[[\s\S]*\]/);
        resolve(JSON.parse(m ? m[0] : out));
      } catch (e) {
        reject(new Error('gap JSON parse failed: ' + e.message));
      }
    });
    proc.stdin.end(prompt);
  });
}

async function load({ hubRoot, claudeBin = 'claude', forceRefresh = false, withGaps = false } = {}) {
  if (!hubRoot) throw new Error('hubRoot required');
  await ensureDir(CACHE_DIR);

  const skills    = await scanSkills(hubRoot);
  const knowledge = await scanKnowledge(hubRoot);
  const indexText = buildIndexText(skills, knowledge);

  if (!withGaps) {
    return { skills, knowledge, indexText, gaps: [], cached: false };
  }

  const signature = `${skills.length}:${knowledge.length}:${
    [...skills, ...knowledge].map(x => `${x.category}/${x.slug}`).sort().join('|')
  }`;

  let cached = null;
  if (!forceRefresh && fs.existsSync(CACHE_FILE)) {
    try { cached = JSON.parse(await fsp.readFile(CACHE_FILE, 'utf8')); } catch {}
  }
  if (cached && cached.signature === signature && Array.isArray(cached.gaps) && cached.gaps.length) {
    return { skills, knowledge, indexText, gaps: cached.gaps, cached: true };
  }

  let gaps = [];
  try {
    gaps = await askClaudeForGaps({ indexText, claudeBin });
  } catch (e) {
    console.error('[hub-inventory] gap analysis failed:', e.message);
  }
  await fsp.writeFile(CACHE_FILE, JSON.stringify({ signature, gaps, ts: Date.now() }, null, 2));
  return { skills, knowledge, indexText, gaps, cached: false };
}

function invalidate() {
  try { fs.unlinkSync(CACHE_FILE); } catch {}
}

module.exports = { load, invalidate, buildIndexText, derivePurpose, frontmatterField };
