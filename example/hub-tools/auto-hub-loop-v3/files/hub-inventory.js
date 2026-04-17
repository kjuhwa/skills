// hub-inventory.js
// -------------------------------------------------------------
// Session-level hub scan. Produces a COMPRESSED one-line index
// (slug + category + ≤15-word purpose) instead of dumping full
// SKILL.md bodies into every cycle prompt. Also caches the
// session's "gap list" — domains Claude itself judged under-
// developed — so theme generation can target real holes.
//
// Typical usage from server.js:
//
//   const hub = require('./hub-inventory');
//   const inv = await hub.load({ hubRoot, claudeBin });
//   // inv.indexText  -> compressed index (pass to prompts)
//   // inv.gaps       -> [{ area, reason }]
//   // inv.skills     -> [{ slug, category, purpose, path }]
//   // inv.knowledge  -> [{ slug, category, purpose, path }]
//
// load() reuses a cached snapshot if the hub mtime hasn't moved,
// so you call it freely — it only does real work when the hub
// actually changes.
// -------------------------------------------------------------

const fs    = require('fs');
const fsp   = require('fs/promises');
const path  = require('path');
const os    = require('os');
const { spawn } = require('child_process');

const CACHE_DIR  = path.join(os.homedir(), '.cache', 'hub-loop-v3');
const CACHE_FILE = path.join(CACHE_DIR, 'inventory.json');

// ---------- tiny utilities ----------

async function ensureDir(p) { await fsp.mkdir(p, { recursive: true }); }

// FNV-1a 32-bit — deterministic, zero-dep, collision-fine for signatures
function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

async function walk(dir, depth = 3) {
  const out = [];
  async function rec(d, left) {
    if (left < 0) return;
    let entries;
    try { entries = await fsp.readdir(d, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await rec(full, left - 1);
      else if (e.isFile()) out.push(full);
    }
  }
  await rec(dir, depth);
  return out;
}

function parseFrontmatter(md) {
  // SKILL.md convention: leading `---` block with `name:`, `description:`, etc.
  // The description is ALWAYS a better purpose-line than anything we'd
  // scrape from the body — so extract it properly instead of nuking the
  // whole frontmatter.
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    // Strip surrounding quotes (single or double), then unescape \" / \'
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1).replace(/\\(["'])/g, '$1');
    }
    out[kv[1]] = v;
  }
  return out;
}

function firstSentence(md, maxWords = 20) {
  // 1) Prefer frontmatter description — canonical summary.
  const fm = parseFrontmatter(md);
  let source = fm && fm.description;

  // 2) Fallback: scrape body (strip frontmatter, headers, code blocks)
  if (!source) {
    source = md
      .replace(/^---[\s\S]*?---/, '')
      .replace(/^#.*$/gm, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (!source) return '';

  // Take first sentence-ish chunk, then cap at maxWords.
  const sent = source.split(/(?<=[.!?。])\s/)[0] || source;
  const words = sent.split(/\s+/).slice(0, maxWords);
  return words.join(' ').replace(/[.,;:]$/, '');
}

function categoryOf(filePath, hubRoot) {
  // Expects hubRoot/<kind>/<category>/<slug>/FILE.md
  const rel = path.relative(hubRoot, filePath).split(path.sep);
  return rel.length >= 3 ? rel[1] : 'uncategorized';
}

function slugOf(filePath) {
  return path.basename(path.dirname(filePath));
}

// ---------- hub scan ----------

async function scanKind(root, kind, markerFile) {
  const kindRoot = path.join(root, kind);
  if (!fs.existsSync(kindRoot)) return [];
  const files = await walk(kindRoot, 4);
  const marker = markerFile.toLowerCase();
  const items = [];
  for (const f of files) {
    if (path.basename(f).toLowerCase() !== marker) continue;
    let body = '';
    let stat;
    try {
      body = await fsp.readFile(f, 'utf8');
      stat = await fsp.stat(f);
    } catch { continue; }
    items.push({
      slug: slugOf(f),
      category: categoryOf(f, root),
      purpose: firstSentence(body),
      path: f,
      mtimeMs: stat.mtimeMs,
      size: stat.size,
    });
  }
  // stable order
  items.sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug));
  return items;
}

function buildIndexText(skills, knowledge) {
  const lines = [];
  lines.push(`## Skills (${skills.length})`);
  for (const s of skills) {
    lines.push(`- \`${s.slug}\` [${s.category}] — ${s.purpose}`);
  }
  lines.push('');
  lines.push(`## Knowledge (${knowledge.length})`);
  for (const k of knowledge) {
    lines.push(`- \`${k.slug}\` [${k.category}] — ${k.purpose}`);
  }
  return lines.join('\n');
}

// ---------- gap analysis (one Claude call, cached) ----------

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
      // Windows: claude is typically installed as claude.cmd/claude.bat,
      // and Node's spawn without shell:true can't resolve .cmd/.bat extensions,
      // producing ENOENT. shell:true is safe here because our argv is a
      // fixed literal (['-p']) and the prompt goes through stdin.
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
      if (code !== 0) return reject(new Error(`claude exit ${code}: ${err}`));
      try {
        const match = out.match(/\[[\s\S]*\]/);
        resolve(JSON.parse(match ? match[0] : out));
      } catch (e) {
        reject(new Error('gap JSON parse failed: ' + e.message + '\n' + out.slice(0, 500)));
      }
    });
    proc.stdin.end(prompt);
  });
}

// ---------- public API ----------

async function load({ hubRoot, claudeBin = 'claude', forceRefresh = false } = {}) {
  if (!hubRoot) throw new Error('hubRoot required');
  await ensureDir(CACHE_DIR);

  // cache validity: hub mtime (deepest) + cache file
  const skills    = await scanKind(hubRoot, 'example', 'SKILL.md');  // path shape per your repo
  const knowledge = await scanKind(hubRoot, 'knowledge', 'README.md'); // adjust if your marker differs

  // Signature combines four things so any real change invalidates:
  //   - counts (add/remove items)
  //   - max mtime across all marker files (content edits)
  //   - sum of sizes (touched-but-not-mtime-bumped edge cases)
  //   - sorted slug list (renames without size change)
  const all = [...skills, ...knowledge];
  const maxMtime = all.reduce((m, x) => x.mtimeMs > m ? x.mtimeMs : m, 0);
  const totalSize = all.reduce((s, x) => s + x.size, 0);
  const slugList = all.map(x => x.slug).sort().join('|');
  const signature = `${skills.length}:${knowledge.length}:${maxMtime}:${totalSize}:${hashString(slugList)}`;

  let cached = null;
  if (!forceRefresh && fs.existsSync(CACHE_FILE)) {
    try { cached = JSON.parse(await fsp.readFile(CACHE_FILE, 'utf8')); } catch {}
  }

  const indexText = buildIndexText(skills, knowledge);

  if (cached && cached.signature === signature && Array.isArray(cached.gaps) && cached.gaps.length) {
    return { skills, knowledge, indexText, gaps: cached.gaps, cached: true };
  }

  let gaps = [];
  try {
    gaps = await askClaudeForGaps({ indexText, claudeBin });
  } catch (e) {
    console.error('[hub-inventory] gap analysis failed, continuing with empty gaps:', e.message);
  }

  await fsp.writeFile(CACHE_FILE, JSON.stringify({ signature, gaps, ts: Date.now() }, null, 2));
  return { skills, knowledge, indexText, gaps, cached: false };
}

function invalidate() {
  try { fs.unlinkSync(CACHE_FILE); } catch {}
}

module.exports = { load, invalidate, buildIndexText };
