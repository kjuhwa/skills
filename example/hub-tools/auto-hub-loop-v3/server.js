// ─── Hub Auto-Loop Server ───
// Automated pipeline: generate → build → publish → merge → extract → publish-sk → install → loop
// Zero external dependencies — Node.js built-in modules only

const http = require('http');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const hubInventory = require('./hub-loop-v3/hub-inventory');
const dedupGate = require('./hub-loop-v3/dedup-gate');

const PORT = 8917;
const toSlash = p => p.replace(/\\/g, '/');  // Windows paths → bash-safe
const WORK_DIR = toSlash(path.resolve(__dirname, '..'));
const SKILLS_HUB = toSlash(path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'skills-hub', 'remote'));
const SKILLS_DEST = toSlash(path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'skills'));
const REGISTRY_PATH = toSlash(path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'skills-hub', 'registry.json'));

// ── State ──
const state = {
  status: 'idle',    // idle | running | stopping | error
  cycle: 0,
  currentKeyword: null,
  phase: null,
  apps: [],
  skills: [],
  knowledge: [],
  stats: { apps: 0, skills: 0, knowledge: 0, prs: 0, lines: 0 },
  startTime: null,
  stopRequested: false,
  runOnce: false,    // single-cycle mode
};

// ── Token Usage (accumulated from `claude -p --output-format json`) ──
const tokenUsage = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0, costUsd: 0, calls: 0, lastUpdated: null };
function totalLoopTokens() {
  return tokenUsage.input + tokenUsage.output + tokenUsage.cacheRead + tokenUsage.cacheCreation;
}
function addUsage(u, costUsd) {
  if (!u) return;
  tokenUsage.input += u.input_tokens || 0;
  tokenUsage.output += u.output_tokens || 0;
  tokenUsage.cacheRead += u.cache_read_input_tokens || 0;
  tokenUsage.cacheCreation += u.cache_creation_input_tokens || 0;
  tokenUsage.costUsd += costUsd || 0;
  tokenUsage.calls += 1;
  tokenUsage.lastUpdated = Date.now();
  broadcast({ type: 'usage', usage: tokenUsage, calibration: calibrationSnapshot() });
}

// ── 5h Limit Calibration (runtime estimation from account % delta) ──
function readUsageCache() {
  const home = process.env.HOME || process.env.USERPROFILE;
  const dir = path.join(home, '.claude', 'plugins', 'oh-my-claudecode');
  // Try both filenames — varies by OMC plugin version
  for (const name of ['.usage-cache.json', '.usage-cache-anthropic.json']) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) {
      try { return JSON.parse(fs.readFileSync(p, 'utf8')).data || null; } catch { /* try next */ }
    }
  }
  return null;
}
const calibration = { tokensPerPct: null, samples: [], lastPct: null, lastLoopTokens: null };
function calibrationSnapshot() {
  const total = totalLoopTokens();
  const loop5hPercent = calibration.tokensPerPct ? total / calibration.tokensPerPct : null;
  return { tokensPerPct: calibration.tokensPerPct, estimatedLimit: calibration.tokensPerPct ? calibration.tokensPerPct * 100 : null, loop5hPercent, samples: calibration.samples.length };
}
function calibrate() {
  const data = readUsageCache();
  if (!data || typeof data.fiveHourPercent !== 'number') return;
  const pct = data.fiveHourPercent;
  const total = totalLoopTokens();
  if (calibration.lastPct != null) {
    const dPct = pct - calibration.lastPct;
    const dTokens = total - calibration.lastLoopTokens;
    if (dPct < -2) calibration.samples = [];  // 5h window rollover — reset estimate
    else if (dPct > 0.5 && dTokens > 0) {
      calibration.samples.push({ dTokens, dPct });
      if (calibration.samples.length > 10) calibration.samples.shift();
      const sumT = calibration.samples.reduce((s, x) => s + x.dTokens, 0);
      const sumP = calibration.samples.reduce((s, x) => s + x.dPct, 0);
      calibration.tokensPerPct = sumT / sumP;
    }
  }
  calibration.lastPct = pct;
  calibration.lastLoopTokens = total;
  broadcast({ type: 'usage', usage: tokenUsage, calibration: calibrationSnapshot() });
}
setImmediate(calibrate);  // defer until module init finishes (clients/logBuffer are declared below)
setInterval(calibrate, 60000);

// ── SSE Clients ──
const clients = [];
const logBuffer = [];    // Keep last 200 log entries for new SSE connections
function broadcast(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => { try { res.write(msg); } catch {} });
}
function log(level, message) {
  const entry = { type: 'log', level, message };
  logBuffer.push(entry);
  if (logBuffer.length > 200) logBuffer.shift();
  broadcast(entry);
  const prefix = { info: '  ', success: '✓', warn: '⚠', error: '✗', phase: '►' }[level] || ' ';
  console.log(`[${new Date().toLocaleTimeString()}] ${prefix} ${message}`);
}

// ── Random Keywords ──
// Fallback pool (10-20 word evocative themes)
const KEYWORD_FALLBACK = [
  'A cozy lighthouse keeper decodes midnight signals drifting across the stormy ocean horizon',
  'Tiny garden gnomes orchestrate a symphony while moonflowers bloom and fireflies weave patterns',
  'Ancient librarians sort whispered secrets into glowing tomes within a floating crystal archive',
  'Travelers trade constellations at a bustling skybound market above the clouds at dawn',
  'Forest spirits knit paths of moss while cartographers chart their shifting territories by lantern',
  'Dreamers assemble mechanical butterflies and launch them through windows into a neon alley',
  'A patient cartographer redraws coastlines as tides whisper forgotten names beneath silver moonlight',
  'Cooks braid ribbons of steam into recipes recorded by a curious mouse wearing spectacles',
  'Wanderers stitch patchwork quilts from discarded dreams beside a bonfire near an obsidian lake',
];
const KEYWORD_TO_CATEGORY = {
  // Nouns → thematic categories
  'garden': 'interactive', 'ocean': 'interactive', 'forest': 'interactive',
  'city': 'interactive', 'galaxy': 'interactive',
  'library': 'hub-tools', 'museum': 'hub-tools',
  'kitchen': 'interactive', 'factory': 'interactive', 'workshop': 'interactive',
  // Verbs → action categories
  'explore': 'interactive', 'discover': 'interactive', 'navigate': 'interactive',
  'create': 'interactive', 'compose': 'interactive',
  'simulate': 'algorithms', 'visualize': 'interactive',
  'analyze': 'algorithms', 'transform': 'algorithms',
  'connect': 'messaging',
};

function categoryForKeyword(kw) {
  if (!kw) return 'misc';
  if (KEYWORD_TO_CATEGORY[kw]) return KEYWORD_TO_CATEGORY[kw];
  // Substring match — scan phrase for known keyword
  const lower = kw.toLowerCase();
  for (const [k, cat] of Object.entries(KEYWORD_TO_CATEGORY)) {
    if (lower.includes(k)) return cat;
  }
  // Fallback keyword → category hints based on phrase content
  const hints = [
    [['garden','forest','ocean','galaxy','moon','sky','lighthouse','cave','river','mountain'], 'interactive'],
    [['library','archive','tome','book','map','cartograph'], 'hub-tools'],
    [['trade','market','orchestrate','assemble','weave','knit','stitch'], 'interactive'],
    [['analyze','decode','pattern','signal','chart'], 'algorithms'],
    [['whisper','connect','message','send','transmit'], 'messaging'],
  ];
  for (const [words, cat] of hints) {
    for (const w of words) {
      if (lower.includes(w)) return cat;
    }
  }
  return 'misc';
}

const usedKeywords = new Set();

// ── Hub inventory (v3: compressed index, cached between cycles) ──
let currentInventory = null;
async function refreshInventory() {
  try {
    currentInventory = await hubInventory.load({ hubRoot: SKILLS_HUB });
    log('info', `Hub inventory: ${currentInventory.skills.length} skills + ${currentInventory.knowledge.length} knowledge (v3 compressed index)`);
  } catch (e) {
    log('warn', `Hub inventory load failed: ${e.message.split('\n')[0]} — falling back to legacy sampler`);
    currentInventory = null;
  }
  return currentInventory;
}

async function pickKeyword() {
  const recent = [...usedKeywords].slice(-5).join(' | ') || '(none)';
  const prompt = `Generate ONE random evocative theme phrase (5 to 15 English words) suitable as a creative theme for a set of 3 interactive HTML visualization apps.

Constraints:
- Must be 5-15 words total (count carefully)
- NOUNS ONLY — no verbs, no adjectives, no adverbs. Every word must be a noun.
- IT / computer science / distributed systems terminology ONLY
- Combine multiple IT concepts into a creative compound phrase
- Must NOT repeat these recent themes: ${recent}
- Examples of good themes:
  - "consensus raft quorum leader election heartbeat timeout partition"
  - "cache eviction shard replica failover circuit breaker backpressure"
  - "merkle tree bloom filter consistent hashing ring topology gossip protocol"
  - "container orchestration pod namespace service mesh sidecar proxy"
  - "event sourcing saga outbox CDC snapshot aggregate projection"

Output ONLY the phrase, no quotes, no explanation, nothing else.`;

  try {
    const raw = await askClaude(prompt, 60000);
    const phrase = raw.trim().replace(/^["']|["']$/g, '');
    const wordCount = phrase.split(/\s+/).filter(Boolean).length;
    if (phrase && wordCount >= 8 && wordCount <= 25 && !usedKeywords.has(phrase)) {
      usedKeywords.add(phrase);
      return phrase;
    }
  } catch {}

  // Fallback: pick from the local pool
  const available = KEYWORD_FALLBACK.filter(k => !usedKeywords.has(k));
  const pool = available.length > 0 ? available : KEYWORD_FALLBACK;
  const kw = pool[Math.floor(Math.random() * pool.length)];
  usedKeywords.add(kw);
  return kw;
}

// ── Shell Helper ──
function shell(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    const options = { maxBuffer: 10 * 1024 * 1024, timeout: opts.timeout || 600000, cwd: opts.cwd };
    exec(cmd, options, (err, stdout, stderr) => {
      if (err && !opts.ignoreError) reject(new Error(`${err.message}\n${stderr}`));
      else resolve((stdout || '').trim());
    });
  });
}

function shellSync(cmd, opts = {}) {
  try {
    return execSync(cmd, { maxBuffer: 10 * 1024 * 1024, cwd: opts.cwd, encoding: 'utf8' }).trim();
  } catch (e) {
    if (!opts.ignoreError) throw e;
    return '';
  }
}

// ── Claude CLI Helper ──
async function askClaude(prompt, timeout = 1800000) {
  const { spawn } = require('child_process');
  // Write prompt to a temp file and pipe via shell redirect — avoids argv length limits AND stdin propagation issues
  const tmpFile = path.join(require('os').tmpdir(), `claude-prompt-${Date.now()}-${Math.random().toString(36).slice(2,8)}.txt`);
  fs.writeFileSync(tmpFile, prompt, 'utf8');

  return new Promise((resolve, reject) => {
    // Use shell redirect `< file` so claude's stdin comes from the file
    const cmd = process.platform === 'win32'
      ? `claude -p --output-format json < "${tmpFile.replace(/\\/g, '/')}"`
      : `claude -p --output-format json < "${tmpFile}"`;
    const child = spawn(cmd, [], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, DISABLE_OMC: '1', OMC_SKIP_HOOKS: '*', CLAUDE_DISABLE_SESSION_HOOKS: '1' },
    });
    let stdout = ''; let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      try { fs.unlinkSync(tmpFile); } catch {}
      reject(new Error('askClaude timeout'));
    }, timeout);
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => { clearTimeout(timer); try { fs.unlinkSync(tmpFile); } catch {}; reject(err); });
    child.on('close', (code) => {
      clearTimeout(timer);
      try { fs.unlinkSync(tmpFile); } catch {}
      if (code !== 0) { reject(new Error(`claude exited ${code}: ${stderr.split('\n')[0]}`)); return; }
      try {
        const parsed = JSON.parse(stdout.trim());
        addUsage(parsed.usage, parsed.total_cost_usd);
        resolve((parsed.result || '').trim());
      } catch { resolve(stdout.trim()); }
    });
  });
}

// ── File Writer from Claude Output ──
function parseAndWriteFiles(output, targetDir) {
  const files = [];
  const fileRegex = /===FILE:(.+?)===\n([\s\S]*?)===END===/g;
  let match;
  while ((match = fileRegex.exec(output)) !== null) {
    const filePath = match[1].trim();
    const content = match[2].trim();
    const fullPath = path.join(targetDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
    files.push({ path: filePath, lines: content.split('\n').length });
  }
  return files;
}

// ── Next project number ──
function getNextProjectNum() {
  const dirs = fs.readdirSync(WORK_DIR).filter(d => /^\d{2}-/.test(d)).sort();
  if (dirs.length === 0) return 17;
  const last = parseInt(dirs[dirs.length - 1].split('-')[0], 10);
  return last + 1;
}

// Remote sampling helpers
function listExistingSkillNames() {
  try {
    const skillsDir = path.join(SKILLS_HUB, 'skills');
    if (!fs.existsSync(skillsDir)) return [];
    const names = [];
    for (const cat of fs.readdirSync(skillsDir)) {
      const catPath = path.join(skillsDir, cat);
      if (!fs.statSync(catPath).isDirectory()) continue;
      for (const name of fs.readdirSync(catPath)) {
        if (fs.existsSync(path.join(catPath, name, 'SKILL.md'))) names.push(name);
      }
    }
    return names;
  } catch { return []; }
}

function listExistingKnowledgeNames() {
  try {
    const kDir = path.join(SKILLS_HUB, 'knowledge');
    if (!fs.existsSync(kDir)) return [];
    const names = [];
    for (const cat of fs.readdirSync(kDir)) {
      const catPath = path.join(kDir, cat);
      if (!fs.statSync(catPath).isDirectory()) continue;
      for (const f of fs.readdirSync(catPath)) {
        if (f.endsWith('.md')) names.push(f.replace(/\.md$/, ''));
      }
    }
    return names;
  } catch { return []; }
}

function sampleRandom(arr, n) {
  const pool = [...arr]; const out = [];
  while (out.length < n && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool[idx]); pool.splice(idx, 1);
  }
  return out;
}

function sampleSkillsWithMeta(n) {
  const skillsDir = path.join(SKILLS_HUB, 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  const all = [];
  try {
    for (const cat of fs.readdirSync(skillsDir)) {
      const catPath = path.join(skillsDir, cat);
      if (!fs.statSync(catPath).isDirectory()) continue;
      for (const name of fs.readdirSync(catPath)) {
        const f = path.join(catPath, name, 'SKILL.md');
        if (!fs.existsSync(f)) continue;
        try {
          const txt = fs.readFileSync(f, 'utf8');
          const desc = (txt.match(/^description:\s*(.+)$/m)?.[1] || '').trim();
          all.push({ name, category: cat, description: desc });
        } catch {}
      }
    }
  } catch {}
  return sampleRandom(all, n);
}

function sampleKnowledgeWithMeta(n) {
  const kDir = path.join(SKILLS_HUB, 'knowledge');
  if (!fs.existsSync(kDir)) return [];
  const all = [];
  try {
    for (const cat of fs.readdirSync(kDir)) {
      const catPath = path.join(kDir, cat);
      if (!fs.statSync(catPath).isDirectory()) continue;
      for (const f of fs.readdirSync(catPath).filter(x => x.endsWith('.md'))) {
        try {
          const txt = fs.readFileSync(path.join(catPath, f), 'utf8');
          const desc = (txt.match(/^description:\s*(.+)$/m)?.[1] || '').trim();
          all.push({ name: f.replace(/\.md$/, ''), category: cat, description: desc });
        } catch {}
      }
    }
  } catch {}
  return sampleRandom(all, n);
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  PIPELINE PHASES                                             ║
// ╚══════════════════════════════════════════════════════════════╝

async function phaseGenerate(keyword) {
  setPhase('generate');
  log('phase', `Phase 1: Generate 3 distinct app ideas for "${keyword}"`);

  // Hub inventory (v3 compressed index) — falls back to legacy sampler if v3 unavailable
  const inv = currentInventory || await refreshInventory();
  let skillsBlock;
  if (inv && inv.skills.length > 0) {
    skillsBlock = inv.skills
      .map(s => `  - \`${s.slug}\` (${s.category}): ${s.description || s.purpose || ''}`)
      .join('\n');
    log('info', `Inventory (v3): ${inv.skills.length} skills + ${inv.knowledge.length} knowledge`);
  } else {
    const allSkills = sampleSkillsWithMeta(1000);
    skillsBlock = allSkills.length > 0
      ? allSkills.map(s => `  - \`${s.name}\` (${s.category}): ${s.description || ''}`).join('\n')
      : '  (no skills available)';
    log('info', `Inventory (legacy): ${allSkills.length} skills`);
  }

  // ── Phase 1a: Generate 3 app IDEAS (lightweight — names, descriptions, tech assignments) ──
  const appSpecs = [
    { role: 'VISUALIZATION/EXPLORER', framework: 'React 18+ (CDN: react, react-dom, babel-standalone)', palette: 'deep ocean (--bg #0a0e1a, --surface #111a2e, --accent #00d4ff)', tech: 'Canvas 2D, hooks, functional components' },
    { role: 'SIMULATION/GAME', framework: 'Vue 3 (CDN: vue@3 global build)', palette: 'warm amber/copper (--bg #1a1410, --surface #2a2018, --accent #f0a050)', tech: 'SVG, Composition API, directives' },
    { role: 'TOOL/CALCULATOR', framework: 'D3.js v7 (CDN: d3@7)', palette: 'terminal green (--bg #0a0a0a, --surface #1a1a1a, --accent #33ff33)', tech: 'D3 data joins, scales, force simulations' },
  ];

  const ideaPrompt = `Generate 3 app ideas for the theme "${keyword}". Each from a DIFFERENT angle:

1. ${appSpecs[0].role} (${appSpecs[0].framework})
2. ${appSpecs[1].role} (${appSpecs[1].framework})
3. ${appSpecs[2].role} (${appSpecs[2].framework})

For each, output EXACTLY:
===IDEA===
name: <kebab-case, 2-4 words, evocative>
title: <Human Readable Title>
why: <one sentence, 10-20 words>
features:
- <feature 1>
- <feature 2>
- <feature 3>
- <feature 4>
- <feature 5>
===END-IDEA===

Output ONLY the 3 IDEA blocks, nothing else.`;

  log('info', 'Phase 1a: Generating 3 app ideas...');
  const ideasRaw = await askClaude(ideaPrompt, 120000);
  const ideaRegex = /===IDEA===\n([\s\S]*?)===END-IDEA===/g;
  const ideas = [];
  let im;
  while ((im = ideaRegex.exec(ideasRaw)) !== null) {
    const block = im[1];
    ideas.push({
      name: (block.match(/^\s*name:\s*(.+)$/m)?.[1] || '').trim(),
      title: (block.match(/^\s*title:\s*(.+)$/m)?.[1] || '').trim(),
      why: (block.match(/^\s*why:\s*(.+)$/m)?.[1] || '').trim(),
      features: (block.match(/features:\n([\s\S]*?)$/)?.[1] || '').trim(),
    });
  }

  if (ideas.length < 3) {
    log('warn', `Only ${ideas.length} ideas parsed, expected 3`);
    return ideasRaw; // fallback to legacy single-pass
  }

  log('info', `Ideas: ${ideas.map(i => i.name).join(', ')}`);

  // ── Phase 1b: Generate code for EACH app individually ──
  const allResponses = [];
  for (let i = 0; i < 3; i++) {
    const spec = appSpecs[i];
    const idea = ideas[i];
    log('info', `Phase 1b-${i+1}: Generating code for "${idea.name}" (${spec.framework})...`);

    const codePrompt = `You are building a single web app. Theme: "${keyword}". App concept: "${idea.title}" — ${idea.why}

Features to implement:
${idea.features}

Available skills inventory (use relevant ones):
${skillsBlock.slice(0, 8000)}

Technical spec:
- Role: ${spec.role}
- Framework: ${spec.framework} — use it properly with idiomatic patterns
- Color palette: ${spec.palette}
- Rendering: ${spec.tech}
- CDN imports ONLY (unpkg.com or cdnjs.cloudflare.com)
- MINIMUM 1,500 lines (aim for 2,000+) — this is ONE app, use the FULL response for it
- Include 5+ distinct interactive sections/panels/tabs with independent state
- Immediately interactive on load with meaningful mock data
- Modern UX: hover states, transitions, keyboard shortcuts

Output EXACTLY this format:

===APP===
name: ${idea.name}
title: ${idea.title}
why: ${idea.why}
features:
${idea.features}
stack: ${spec.framework.split(' ')[0].toLowerCase()}
===FILE:index.html===
<SINGLE SELF-CONTAINED HTML FILE — ALL CSS in <style>, ALL JS in <script>. NO external .js/.css files. Must work via file:// protocol.>
===END===
===END-APP===

CRITICAL: Output ONLY the APP block. No commentary, no code fences, no explanation.`;

    const response = await askClaude(codePrompt, 1800000);
    allResponses.push(response);
    log('info', `App ${i+1} "${idea.name}" generated (${response.length} chars)`);
  }

  return allResponses.join('\n\n');
}

async function phaseBuild(claudeOutput, keyword, cycleNum) {
  setPhase('build');
  log('phase', 'Phase 2: Build apps from generated code');

  const builtApps = [];
  const num = getNextProjectNum();

  // Parse structured ===APP=== blocks with metadata + nested ===FILE=== blocks
  const appBlockRegex = /===APP===\n([\s\S]*?)===END-APP===/g;
  const parsedApps = [];
  let m;
  while ((m = appBlockRegex.exec(claudeOutput)) !== null) {
    const block = m[1];
    // Extract metadata (before first ===FILE===)
    const metaEnd = block.indexOf('===FILE:');
    const meta = metaEnd >= 0 ? block.slice(0, metaEnd) : block;
    const name = (meta.match(/^\s*name:\s*(.+)$/m)?.[1] || '').trim();
    const title = (meta.match(/^\s*title:\s*(.+)$/m)?.[1] || '').trim();
    const why = (meta.match(/^\s*why:\s*(.+)$/m)?.[1] || '').trim();
    const stack = (meta.match(/^\s*stack:\s*(.+)$/m)?.[1] || 'html, css, vanilla-js').trim();
    const featuresBlock = meta.match(/features:\s*\n([\s\S]*?)(?=\n(?:stack|===|$))/i);
    const features = featuresBlock ? featuresBlock[1].split('\n').map(l => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean) : [];

    // Extract files
    const fileRegex = /===FILE:(.+?)===\n([\s\S]*?)===END===/g;
    const files = [];
    let fm;
    while ((fm = fileRegex.exec(block)) !== null) {
      files.push({ path: fm[1].trim(), content: fm[2].trim() });
    }

    if (name && files.length > 0) {
      parsedApps.push({ name, title, why, stack, features, files });
    }
  }

  // Fallback: legacy ===FILE:app-name/...=== format
  if (parsedApps.length === 0) {
    log('warn', 'No ===APP=== blocks found, trying legacy parser');
    const legacyRegex = /===FILE:(.+?)===\n([\s\S]*?)===END===/g;
    const byApp = {};
    let lm;
    while ((lm = legacyRegex.exec(claudeOutput)) !== null) {
      const p = lm[1].trim();
      const content = lm[2].trim();
      const appName = p.includes('/') ? p.split('/')[0] : null;
      if (!appName) continue;
      if (!byApp[appName]) byApp[appName] = [];
      byApp[appName].push({ path: p.replace(`${appName}/`, ''), content });
    }
    for (const [name, files] of Object.entries(byApp)) {
      parsedApps.push({ name, title: '', why: '', stack: 'html, css, vanilla-js', features: [], files });
    }
  }

  if (parsedApps.length === 0) {
    log('error', 'Parsed 0 apps from Claude output');
    // Dump response to a log file for inspection
    try {
      const dumpFile = path.join(__dirname, `.debug-claude-cycle${cycleNum}.txt`);
      fs.writeFileSync(dumpFile, claudeOutput || '(empty response)', 'utf8');
      log('info', `Response dumped to ${dumpFile} (${(claudeOutput||'').length} chars)`);
      // Log first 300 chars so we can see format
      const preview = (claudeOutput || '').slice(0, 300).replace(/\n/g, ' | ');
      log('info', `Preview: ${preview}`);
    } catch {}
    return builtApps;
  }

  let appIdx = 0;
  for (const app of parsedApps.slice(0, 3)) {
    const projNum = String(num + appIdx).padStart(2, '0');
    const projDir = path.join(WORK_DIR, `${projNum}-${app.name}`);
    fs.mkdirSync(projDir, { recursive: true });

    let totalLines = 0;
    for (const file of app.files) {
      const fullPath = path.join(projDir, file.path);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, file.content, 'utf8');
      totalLines += file.content.split('\n').length;
    }

    // Validate JS — check app.js if it exists (legacy), otherwise skip (single-file HTML apps embed JS inline)
    let valid = true;
    const jsFile = path.join(projDir, 'app.js');
    if (fs.existsSync(jsFile)) {
      // Skip syntax check for JSX files (contain < tokens that node --check rejects)
      const content = fs.readFileSync(jsFile, 'utf8');
      const isJSX = /React|jsx|createElement|<\w+[\s/>]/.test(content);
      if (!isJSX) {
        try { shellSync(`node --check "${jsFile}"`); }
        catch { log('warn', `${app.name}: JS syntax error`); valid = false; }
      }
    }

    const title = app.title || app.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const built = {
      name: app.name,
      dir: `${projNum}-${app.name}`,
      cycle: cycleNum,
      lines: totalLines,
      status: 'built',
      keyword,
      valid,
      title,
      why: app.why || `Interactive ${keyword} experience.`,
      features: app.features || [],
      stack: app.stack,
    };
    builtApps.push(built);
    state.apps.push(built);
    state.stats.apps++;
    state.stats.lines += totalLines;
    broadcast({ type: 'app', app: built });
    broadcast({ type: 'stats', stats: state.stats });
    log('success', `Built: ${built.dir} (${totalLines} lines) — ${title}`);
    appIdx++;
  }

  // Extract cited skills/knowledge from Claude output for the Recipe panel
  try {
    const allSkillNames = listExistingSkillNames();
    const allKnowNames = listExistingKnowledgeNames();
    // Build {name:category} lookup once
    const skillCat = {};
    for (const s of sampleSkillsWithMeta(9999)) skillCat[s.name] = s.category;
    const knowCat = {};
    for (const k of sampleKnowledgeWithMeta(9999)) knowCat[k.name] = k.category;

    const bigText = (claudeOutput || '') + ' ' + builtApps.map(a => (a.features || []).join(' ') + ' ' + (a.why || '')).join(' ');
    const appliedSet = new Set();
    const respectingSet = new Set();

    for (const name of allSkillNames) {
      // Look for backtick or whole-word match
      const re = new RegExp('`' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '`|\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (re.test(bigText)) appliedSet.add(name);
    }
    for (const name of allKnowNames) {
      const re = new RegExp('`' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '`|\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (re.test(bigText)) respectingSet.add(name);
    }

    const applied = [...appliedSet].slice(0, 200).map(n => ({ name: n, category: skillCat[n] || 'misc' }));
    const respecting = [...respectingSet].slice(0, 100).map(n => ({ name: n, category: knowCat[n] || 'misc' }));

    broadcast({
      type: 'recipe',
      keyword,
      applied,
      respecting,
      poolSkills: allSkillNames.length,
      poolKnowledge: allKnowNames.length,
    });
    log('info', `Recipe: cited ${applied.length} skills + ${respecting.length} knowledge (pool: ${allSkillNames.length}/${allKnowNames.length})`);
  } catch (err) {
    log('warn', `Recipe extract failed: ${err.message.split('\n')[0]}`);
  }

  return builtApps;
}

async function phasePublish(apps, cycleNum) {
  setPhase('publish');
  log('phase', 'Phase 3: Publish apps to skills-hub');

  const prUrls = [];
  for (const app of apps) {
    if (state.stopRequested) break;
    try {
      const slug = app.name;
      const srcDir = toSlash(path.join(WORK_DIR, app.dir));
      log('info', `Publishing ${slug} from ${srcDir}...`);

      // Reset to main
      await shell(`git -C "${SKILLS_HUB}" fetch origin main --prune`);
      await shell(`git -C "${SKILLS_HUB}" checkout main`);
      await shell(`git -C "${SKILLS_HUB}" reset --hard origin/main`);

      // Determine category for this keyword
      const category = categoryForKeyword(app.keyword);

      // Check if slug exists (in category dir)
      const exCheck = toSlash(path.join(SKILLS_HUB, 'example', category, slug));
      if (fs.existsSync(exCheck)) {
        log('warn', `example/${category}/${slug} already exists, skipping`);
        continue;
      }

      // Create branch (clean up any leftover from previous runs)
      const branch = `example/${slug}`;
      await shell(`git -C "${SKILLS_HUB}" branch -D "${branch}"`, { ignoreError: true });
      await shell(`git -C "${SKILLS_HUB}" push origin --delete "${branch}"`, { ignoreError: true });
      await shell(`git -C "${SKILLS_HUB}" checkout -b "${branch}"`);

      // Copy files (use native paths for fs operations)
      const exDirNative = path.resolve(SKILLS_HUB, 'example', category, slug);
      const srcDirNative = path.resolve(srcDir);
      fs.mkdirSync(exDirNative, { recursive: true });
      const files = fs.readdirSync(srcDirNative).filter(f => !f.startsWith('.'));
      for (const f of files) {
        fs.copyFileSync(path.join(srcDirNative, f), path.join(exDirNative, f));
      }
      const exDir = exDirNative; // for manifest/readme writes below

      // Write manifest
      const title = app.title || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const stackArr = (app.stack || 'html, css, vanilla-js').split(',').map(s => s.trim()).filter(Boolean);
      const manifest = {
        slug,
        title,
        stack: stackArr,
        created_at: new Date().toISOString(),
        source_project: app.dir,
        author: 'kjuhwa@nkia.co.kr',
        keyword: app.keyword,
        cycle: cycleNum,
      };
      fs.writeFileSync(path.join(exDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      // Rich README matching /hub-make output style
      const why = app.why || `Interactive ${app.keyword} experience.`;
      const features = (app.features && app.features.length > 0) ? app.features : [
        `Themed around "${app.keyword}"`,
        'Dark-theme UI with keyboard and pointer interactions',
        'Self-contained, no build step',
      ];
      const readme = [
        `# ${title}`,
        '',
        `> **Why.** ${why}`,
        '',
        '## Features',
        '',
        ...features.map(f => `- ${f}`),
        '',
        '## File structure',
        '',
        '```',
        `${slug}/`,
        '  index.html    — self-contained single-file app (HTML + CSS + JS inline)',
        '  manifest.json — hub metadata',
        '```',
        '',
        '## Usage',
        '',
        '```bash',
        '# any static file server works',
        'python -m http.server 8080',
        '# or open index.html directly in a browser',
        '```',
        '',
        '## Stack',
        '',
        `${stackArr.map(s => '`' + s + '`').join(' · ')} — zero dependencies, ${app.lines} lines`,
        '',
        '## Provenance',
        '',
        `- Generated by auto-hub-loop cycle ${cycleNum} on ${new Date().toISOString().split('T')[0]}`,
        `- Theme keyword: \`${app.keyword}\``,
        `- Source working copy: \`${app.dir}\``,
        '',
      ].join('\n');
      fs.writeFileSync(path.join(exDir, 'README.md'), readme);

      // Commit + push (skip README catalog update to avoid merge conflicts)
      await shell(`git -C "${SKILLS_HUB}" add "example/${category}/${slug}/"`);
      await shell(`git -C "${SKILLS_HUB}" commit -m "example(${slug}): add ${manifest.title}

Auto-generated by hub-auto-loop cycle ${cycleNum}.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"`);
      await shell(`git -C "${SKILLS_HUB}" push -u origin "${branch}"`);

      // Create PR
      const prTitle = `example(${slug}): add ${manifest.title}`;
      const prBody = `Auto-generated by hub-auto-loop cycle ${cycleNum}. Keyword: ${app.keyword}.`;
      const prUrl = await shell(`gh pr create --title "${prTitle}" --body "${prBody}"`, { ignoreError: true, cwd: SKILLS_HUB });
      log('info', `PR result for ${slug}: ${prUrl || '(empty)'}`);

      if (prUrl && prUrl.includes('github.com')) {
        prUrls.push(prUrl);
        app.status = 'published';
        app.prUrl = prUrl;
        state.stats.prs++;
        broadcast({ type: 'app', app });
        broadcast({ type: 'stats', stats: state.stats });
        log('success', `PR created: ${prUrl}`);
      } else {
        log('warn', `PR creation returned no URL for ${slug}`);
      }
    } catch (err) {
      log('error', `Publish ${app.name} failed: ${err.message.split('\n')[0]}`);
    }
  }
  return prUrls;
}

async function phaseMerge(prUrls) {
  setPhase('merge');
  log('phase', 'Phase 4: Auto-merge PRs');

  for (const url of prUrls) {
    if (state.stopRequested) break;
    try {
      const prNum = url.split('/').pop();
      await shell(`gh pr merge ${prNum} --merge --auto`, { ignoreError: true, cwd: SKILLS_HUB });
      await new Promise(r => setTimeout(r, 5000));
      await shell(`gh pr merge ${prNum} --merge`, { ignoreError: true, cwd: SKILLS_HUB });
      log('success', `Merged: PR #${prNum}`);
    } catch (err) {
      log('warn', `Merge PR failed: ${err.message.split('\n')[0]}`);
    }
  }
}

async function phaseExtract(apps, cycleNum) {
  setPhase('extract');
  log('phase', 'Phase 5: Extract skills & knowledge');

  const extracted = { skills: [], knowledge: [] };

  // Analyze built apps for patterns
  const appNames = apps.map(a => a.name).join(', ');
  const keyword = apps[0]?.keyword || 'general';

  // Sample existing skill/knowledge names to avoid template duplicates
  const existingSkills = listExistingSkillNames().slice(0, 200);
  const existingKnowledge = listExistingKnowledgeNames().slice(0, 100);

  // Full inventory for fuzzy dedup — falls back to name-only if v3 unavailable
  const inv = currentInventory || { skills: [], knowledge: [] };
  const existingSkillItems    = inv.skills.length    ? inv.skills    : listExistingSkillNames().map(n => ({ slug: n, purpose: '' }));
  const existingKnowItems     = inv.knowledge.length ? inv.knowledge : listExistingKnowledgeNames().map(n => ({ slug: n, purpose: '' }));

  const prompt = `You built 3 apps this cycle about "${keyword}" (names: ${appNames}).

Your task: identify genuinely NEW, REUSABLE patterns that emerged during the build — NOT the obvious "${keyword}-visualization-pattern" template. Quality over quantity.

Rules:
1. Emit ZERO to THREE skills/knowledge entries — only what truly generalizes beyond this cycle.
2. DO NOT use names already in the repo (these exist): ${existingSkills.slice(0, 60).join(', ')}, ...
3. Avoid naming patterns like "${keyword}-visualization-pattern", "${keyword}-data-simulation", "${keyword}-implementation-pitfall" — too templated.
4. Name each entry descriptively based on the SPECIFIC pattern (e.g. "canvas-spatial-grid-renderer", "simulation-tick-event-queue", "react-less-pixel-sprite-swap"). The name should be evocative + specific.
5. Categories available: design, workflow, arch, ai, backend, frontend, algorithms, misc (pick best fit, not default).
6. Knowledge types: pitfall, decision, workflow, reference.
7. If the cycle didn't produce anything interesting beyond generic patterns, output just "===NONE===" and skip entries.

Output format — emit entries as needed (in any mix, any count):

===SKILL===
name: <descriptive-kebab-case>
category: <one of above>
description: (one line summary)
content: (2-3 paragraphs explaining the reusable pattern, with code-like examples)
===END===

===KNOWLEDGE===
name: <descriptive-kebab-case>
category: <pitfall|decision|workflow|reference>
description: (one line)
content: (2-3 paragraphs explaining the specific lesson)
===END===

Output ONLY blocks that describe real patterns. Empty output is valid. No preamble.`;

  try {
    const response = await askClaude(prompt, 300000);

    // Short-circuit: NONE means Claude decided nothing is worth extracting
    if (/===NONE===/i.test(response)) {
      log('info', 'No new patterns this cycle (Claude returned NONE)');
    }

    const existingSkillSet = new Set(existingSkills);
    const existingKnowSet = new Set(existingKnowledge);

    // Collect raw candidates (parse-only — no filter here)
    const parseBlocks = (regex) => {
      const out = [];
      let m;
      while ((m = regex.exec(response)) !== null) {
        const block = m[1];
        const name = (block.match(/name:\s*(.+)/)?.[1] || '').trim();
        const category = (block.match(/category:\s*(.+)/)?.[1] || '').trim();
        const description = (block.match(/description:\s*(.+)/)?.[1] || '').trim();
        const content = (block.match(/content:\s*([\s\S]*?)$/)?.[1] || '').trim();
        if (!name) continue;
        out.push({ name, category, description, content });
      }
      return out;
    };
    const skillCandidates = parseBlocks(/===SKILL===\n([\s\S]*?)===END===/g);
    const knowCandidates  = parseBlocks(/===KNOWLEDGE===\n([\s\S]*?)===END===/g);

    // Pre-filter: drop exact name matches (cheapest check, keeps gate output cleaner)
    const skillsAfterNameDedup = skillCandidates.filter(c => {
      if (existingSkillSet.has(c.name)) { log('warn', `Skipped exact-dup skill: ${c.name}`); return false; }
      return true;
    });
    const knowAfterNameDedup = knowCandidates.filter(c => {
      if (existingKnowSet.has(c.name)) { log('warn', `Skipped exact-dup knowledge: ${c.name}`); return false; }
      return true;
    });

    // Fuzzy dedup-gate: catches paraphrases & templated suffixes against full inventory
    const toGate = arr => arr.map(c => ({ slug: c.name, purpose: c.description, category: c.category, __orig: c }));
    const skillGate = dedupGate.filter(toGate(skillsAfterNameDedup), existingSkillItems);
    const knowGate  = dedupGate.filter(toGate(knowAfterNameDedup),  existingKnowItems);

    for (const rej of [...skillGate.rejected, ...knowGate.rejected]) {
      log('warn', `dedup-gate rejected "${rej.slug}": ${rej.reason}${rej.nearest ? ` (nearest: ${rej.nearest} @ ${rej.similarity})` : ''}`);
    }
    for (const rev of [...skillGate.review, ...knowGate.review]) {
      log('warn', `dedup-gate review "${rev.slug}": similar to ${rev.nearest} @ ${rev.similarity}`);
    }
    broadcast({ type: 'dedup-review',   items: [...skillGate.review,   ...knowGate.review]   });
    broadcast({ type: 'dedup-rejected', items: [...skillGate.rejected, ...knowGate.rejected] });

    // Finalize accepted skills
    for (const acc of skillGate.accepted) {
      const { name, category, description, content } = acc.__orig;
      extracted.skills.push({ name, category: category || 'misc', description, content });
      state.skills.push({ name, category: category || 'misc', type: 'skill', cycle: cycleNum });
      state.stats.skills++;
      broadcast({ type: 'skill', skill: { name, category: category || 'misc', type: 'skill' } });
      log('success', `Extracted skill: ${name} (${category || 'misc'})`);
    }
    // Finalize accepted knowledge
    for (const acc of knowGate.accepted) {
      const { name, category, description, content } = acc.__orig;
      extracted.knowledge.push({ name, category: category || 'pitfall', description, content });
      state.knowledge.push({ name, category: category || 'pitfall', type: 'knowledge', cycle: cycleNum });
      state.stats.knowledge++;
      broadcast({ type: 'skill', skill: { name, category: category || 'pitfall', type: 'knowledge' } });
      log('success', `Extracted knowledge: ${name} (${category || 'pitfall'})`);
    }

    if (extracted.skills.length === 0 && extracted.knowledge.length === 0) {
      log('info', 'Extraction yielded nothing new — quality over quantity');
    }
  } catch (err) {
    log('error', `Extract failed: ${err.message.split('\n')[0]}`);
  }

  broadcast({ type: 'stats', stats: state.stats });
  return extracted;
}

async function phasePublishSK(extracted, cycleNum) {
  setPhase('publish-sk');
  log('phase', 'Phase 6: Publish skills & knowledge');

  if (extracted.skills.length === 0 && extracted.knowledge.length === 0) {
    log('warn', 'Nothing to publish');
    return;
  }

  try {
    await shell(`git -C "${SKILLS_HUB}" fetch origin main --prune`);
    await shell(`git -C "${SKILLS_HUB}" checkout main`);
    await shell(`git -C "${SKILLS_HUB}" reset --hard origin/main`);

    const branch = `release/auto-loop-cycle-${cycleNum}`;
    await shell(`git -C "${SKILLS_HUB}" branch -D "${branch}"`, { ignoreError: true });
    await shell(`git -C "${SKILLS_HUB}" push origin --delete "${branch}"`, { ignoreError: true });
    await shell(`git -C "${SKILLS_HUB}" checkout -b "${branch}"`);

    // Write knowledge
    for (const k of extracted.knowledge) {
      const dir = path.join(SKILLS_HUB, 'knowledge', k.category);
      fs.mkdirSync(dir, { recursive: true });
      const md = `---\nname: ${k.name}\ndescription: ${k.description}\ncategory: ${k.category}\ntags:\n  - ${extracted.skills[0]?.name?.split('-')[0] || 'auto'}\n  - auto-loop\n---\n\n# ${k.name}\n\n${k.content}\n`;
      fs.writeFileSync(path.join(dir, `${k.name}.md`), md);
    }

    if (extracted.knowledge.length > 0) {
      await shell(`git -C "${SKILLS_HUB}" add knowledge/`);
      await shell(`git -C "${SKILLS_HUB}" commit -m "knowledge: add ${extracted.knowledge.map(k=>k.name).join(', ')} (auto-loop cycle ${cycleNum})"`, { ignoreError: true });
    }

    // Write skills
    for (const s of extracted.skills) {
      const dir = path.join(SKILLS_HUB, 'skills', s.category, s.name);
      fs.mkdirSync(dir, { recursive: true });
      const md = `---\nname: ${s.name}\ndescription: ${s.description}\ncategory: ${s.category}\ntriggers:\n  - ${s.name.replace(/-/g, ' ')}\ntags:\n  - auto-loop\nversion: 1.0.0\n---\n\n# ${s.name}\n\n${s.content}\n`;
      fs.writeFileSync(path.join(dir, 'SKILL.md'), md);
    }

    if (extracted.skills.length > 0) {
      await shell(`git -C "${SKILLS_HUB}" add skills/`);
      await shell(`git -C "${SKILLS_HUB}" commit -m "skills: add ${extracted.skills.map(s=>s.name).join(', ')} (auto-loop cycle ${cycleNum})"`, { ignoreError: true });
    }

    // Push + PR
    await shell(`git -C "${SKILLS_HUB}" push -u origin "${branch}"`);
    const prTitle = `auto-loop cycle ${cycleNum}: ${extracted.skills.length} skills + ${extracted.knowledge.length} knowledge`;
    const prUrl = await shell(`gh pr create --title "${prTitle}" --body "Auto-generated by hub-auto-loop cycle ${cycleNum}."`, { ignoreError: true, cwd: SKILLS_HUB });

    if (prUrl && prUrl.includes('github.com')) {
      state.stats.prs++;
      broadcast({ type: 'stats', stats: state.stats });
      log('success', `S/K PR: ${prUrl}`);

      // Auto-merge
      const prNum = prUrl.split('/').pop();
      await new Promise(r => setTimeout(r, 3000));
      await shell(`gh pr merge ${prNum} --merge`, { ignoreError: true, cwd: SKILLS_HUB });
      log('success', `Merged S/K PR #${prNum}`);
    }
  } catch (err) {
    log('error', `Publish S/K failed: ${err.message.split('\n')[0]}`);
  }
}

async function phaseInstall() {
  setPhase('install');
  log('phase', 'Phase 7: Install all skills & knowledge');

  try {
    await shell(`git -C "${SKILLS_HUB}" checkout main`);
    await shell(`git -C "${SKILLS_HUB}" fetch origin main --prune`);
    await shell(`git -C "${SKILLS_HUB}" reset --hard origin/main`);

    // Install new skills
    const skillDirs = shellSync(`find "${SKILLS_HUB}/skills" -mindepth 2 -name "SKILL.md"`, { ignoreError: true });
    let installed = 0;
    if (skillDirs) {
      for (const f of skillDirs.split('\n').filter(Boolean)) {
        const skillDir = path.dirname(f);
        const name = path.basename(skillDir);
        const dest = path.join(SKILLS_DEST, name);
        if (!fs.existsSync(dest)) {
          fs.cpSync(skillDir, dest, { recursive: true });
          installed++;
        }
      }
    }

    // Install new knowledge
    const knowledgeSrc = path.join(SKILLS_HUB, 'knowledge');
    const knowledgeDest = path.join(WORK_DIR, '.claude', 'knowledge');
    let kInstalled = 0;
    if (fs.existsSync(knowledgeSrc)) {
      for (const cat of fs.readdirSync(knowledgeSrc)) {
        const catDir = path.join(knowledgeSrc, cat);
        if (!fs.statSync(catDir).isDirectory()) continue;
        const destCat = path.join(knowledgeDest, cat);
        fs.mkdirSync(destCat, { recursive: true });
        for (const f of fs.readdirSync(catDir).filter(x => x.endsWith('.md'))) {
          const destFile = path.join(destCat, f);
          if (!fs.existsSync(destFile)) {
            fs.copyFileSync(path.join(catDir, f), destFile);
            kInstalled++;
          }
        }
      }
    }

    log('success', `Installed: ${installed} new skills, ${kInstalled} new knowledge`);

    // Update registry
    if (installed > 0 && fs.existsSync(REGISTRY_PATH)) {
      try {
        const reg = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
        const commit = shellSync(`git -C "${SKILLS_HUB}" rev-parse HEAD`, { ignoreError: true });
        const now = new Date().toISOString();
        const files = shellSync(`find "${SKILLS_HUB}/skills" -mindepth 2 -name "SKILL.md"`, { ignoreError: true });
        for (const f of (files || '').split('\n').filter(Boolean)) {
          const name = path.basename(path.dirname(f));
          const cat = path.basename(path.dirname(path.dirname(f)));
          if (!reg.skills[name]) {
            reg.skills[name] = { name, category: cat, scope: 'project', installed_at: now, version: '1.0.0', source_commit: commit, pinned: false, linked_knowledge: [] };
          }
        }
        fs.writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2));
      } catch {}
    }
  } catch (err) {
    log('error', `Install failed: ${err.message.split('\n')[0]}`);
  }
}

// ── Phase Helper ──
function setPhase(phase) {
  state.phase = phase;
  broadcast({ type: 'phase', phase, status: 'active' });
  // Mark previous phases as done
  const phases = ['generate', 'build', 'publish', 'merge', 'extract', 'publish-sk', 'install', 'loop'];
  const idx = phases.indexOf(phase);
  for (let i = 0; i < idx; i++) {
    broadcast({ type: 'phase', phase: phases[i], status: 'done' });
  }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  MAIN LOOP                                                   ║
// ╚══════════════════════════════════════════════════════════════╝

async function runCycle() {
  state.cycle++;
  const cycleNum = state.cycle;
  log('phase', `═══ CYCLE ${cycleNum} START ═══`);

  // Refresh hub inventory at cycle start (cheap — scan only, no Claude call)
  await refreshInventory();

  const keyword = await pickKeyword();
  state.currentKeyword = keyword;
  broadcast({ type: 'cycle', cycle: cycleNum, keyword });
  log('info', `Keyword: "${keyword}"`);

  try {
    // Phase 1: Generate
    const claudeOutput = await phaseGenerate(keyword);

    if (state.stopRequested) return;

    // Phase 2: Build
    const apps = await phaseBuild(claudeOutput, keyword, cycleNum);

    if (apps.length === 0) {
      log('warn', 'No apps built this cycle, retrying with different keyword');
      return;
    }

    if (state.stopRequested) return;

    // Phase 3: Publish PRs
    const prUrls = await phasePublish(apps, cycleNum);

    if (state.stopRequested) return;

    // Phase 4: Auto-Merge
    if (prUrls.length > 0) {
      await phaseMerge(prUrls);
    }

    if (state.stopRequested) return;

    // Phase 5: Extract skills/knowledge
    const extracted = await phaseExtract(apps, cycleNum);

    if (state.stopRequested) return;

    // Phase 6: Publish skills/knowledge
    await phasePublishSK(extracted, cycleNum);

    if (state.stopRequested) return;

    // Phase 7: Install
    await phaseInstall();

    setPhase('loop');
    log('phase', `═══ CYCLE ${cycleNum} COMPLETE ═══`);
    log('info', `Stats: ${state.stats.apps} apps, ${state.stats.skills} skills, ${state.stats.knowledge} knowledge, ${state.stats.prs} PRs, ${state.stats.lines.toLocaleString()} lines`);

  } catch (err) {
    log('error', `Cycle ${cycleNum} error: ${err.message.split('\n')[0]}`);
  }
}

async function mainLoop() {
  state.status = 'running';
  state.startTime = Date.now();
  state.stopRequested = false;
  broadcast({ type: 'status', status: 'running' });

  while (!state.stopRequested) {
    try {
      await runCycle();
    } catch (err) {
      log('error', `Loop error: ${err.message}`);
    }

    if (state.stopRequested) break;

    // Single-cycle mode: exit after first cycle
    if (state.runOnce) {
      log('phase', '═══ Single run complete — stopping ═══');
      break;
    }

    // Brief pause between cycles
    log('info', 'Next cycle in 10 seconds...');
    await new Promise(r => setTimeout(r, 10000));
  }

  state.status = 'idle';
  state.phase = null;
  broadcast({ type: 'status', status: 'idle' });
  log('info', 'Loop stopped.');
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  HTTP SERVER                                                 ║
// ╚══════════════════════════════════════════════════════════════╝

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

  // Dashboard
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'));
    return;
  }

  // Static image/asset serving
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.pathname)) {
    const fp = path.join(__dirname, decodeURIComponent(url.pathname.replace(/^\//, '')));
    if (fp.startsWith(__dirname) && fs.existsSync(fp)) {
      const ext = path.extname(fp).slice(1).toLowerCase();
      const mime = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', gif:'image/gif', webp:'image/webp', svg:'image/svg+xml' }[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'public, max-age=3600' });
      res.end(fs.readFileSync(fp));
      return;
    }
  }

  // SSE
  if (url.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('\n');
    clients.push(res);
    req.on('close', () => {
      const idx = clients.indexOf(res);
      if (idx >= 0) clients.splice(idx, 1);
    });
    // Send current state
    res.write(`data: ${JSON.stringify({
      type: 'state',
      status: state.status,
      cycle: state.cycle,
      keyword: state.currentKeyword,
      apps: state.apps.slice(-20),
      skills: [...state.skills, ...state.knowledge].slice(-20),
      stats: state.stats,
      uptime: state.startTime ? Date.now() - state.startTime : 0,
    })}\n\n`);
    // Send buffered logs so new connections see history
    for (const entry of logBuffer) {
      res.write(`data: ${JSON.stringify(entry)}\n\n`);
    }
    return;
  }

  // API: auto-hub-loop exact token usage + 5h-limit calibration estimate
  if (url.pathname === '/api/usage') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ...tokenUsage, calibration: calibrationSnapshot() }));
    return;
  }

  // API: state
  // Serve hub item content (skill or knowledge) for click-to-preview
  if (url.pathname === '/api/hub-item') {
    const kind = url.searchParams.get('kind'); // 'skill' or 'knowledge'
    const name = url.searchParams.get('name');
    if (!kind || !name || !/^[a-z0-9-]+$/.test(name)) {
      res.writeHead(400, { 'Content-Type': 'application/json' }); res.end('{"error":"bad request"}'); return;
    }
    let content = null, foundPath = null;
    try {
      if (kind === 'skill') {
        const root = path.join(SKILLS_HUB, 'skills');
        for (const cat of fs.readdirSync(root)) {
          const f = path.join(root, cat, name, 'SKILL.md');
          if (fs.existsSync(f)) { content = fs.readFileSync(f, 'utf8'); foundPath = `skills/${cat}/${name}/SKILL.md`; break; }
        }
      } else if (kind === 'knowledge') {
        const root = path.join(SKILLS_HUB, 'knowledge');
        for (const cat of fs.readdirSync(root)) {
          const f = path.join(root, cat, `${name}.md`);
          if (fs.existsSync(f)) { content = fs.readFileSync(f, 'utf8'); foundPath = `knowledge/${cat}/${name}.md`; break; }
        }
      }
    } catch {}
    if (!content) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{"error":"not found"}'); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ name, kind, path: foundPath, content }));
    return;
  }

  if (url.pathname === '/api/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      type: 'state',
      status: state.status,
      cycle: state.cycle,
      keyword: state.currentKeyword,
      apps: state.apps.slice(-50),
      skills: [...state.skills, ...state.knowledge].slice(-50),
      stats: state.stats,
      uptime: state.startTime ? Date.now() - state.startTime : 0,
    }));
    return;
  }

  // API: start
  if (url.pathname === '/api/start' && req.method === 'POST') {
    if (state.status !== 'running') {
      state.runOnce = false;
      mainLoop().catch(err => log('error', err.message));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Run single cycle then stop
  if (url.pathname === '/api/run-once' && req.method === 'POST') {
    if (state.status !== 'running') {
      state.runOnce = true;
      mainLoop().catch(err => log('error', err.message));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, mode: 'run-once' }));
    return;
  }

  // API: stop
  if (url.pathname === '/api/stop' && req.method === 'POST') {
    state.stopRequested = true;
    state.status = 'stopping';
    broadcast({ type: 'status', status: 'stopping' });
    log('warn', 'Stop requested — finishing current phase...');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // 404
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  Hub Auto-Loop Dashboard: http://localhost:${PORT}\n`);
  console.log('  Press Start in the dashboard to begin the automation loop.\n');
});
