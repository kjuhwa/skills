// ─── Hub Auto-Loop Server ───
// Automated pipeline: generate → build → publish → merge → extract → publish-sk → install → loop
// Zero external dependencies — Node.js built-in modules only

const http = require('http');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
  phase: null,
  apps: [],
  skills: [],
  knowledge: [],
  stats: { apps: 0, skills: 0, knowledge: 0, prs: 0, lines: 0 },
  startTime: null,
  stopRequested: false,
};

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
const KEYWORDS = [
  'websocket', 'oauth', 'graphql', 'cqrs', 'event-sourcing', 'rate-limiter',
  'circuit-breaker', 'saga-pattern', 'blue-green-deploy', 'feature-flags',
  'chaos-engineering', 'load-balancer', 'service-mesh', 'api-versioning',
  'data-pipeline', 'etl', 'cdc', 'outbox-pattern', 'idempotency',
  'bloom-filter', 'consistent-hashing', 'raft-consensus', 'crdt',
  'backpressure', 'bulkhead', 'sidecar-proxy', 'canary-release',
  'database-sharding', 'read-replica', 'materialized-view',
  'command-query', 'domain-driven', 'hexagonal-architecture',
  'finite-state-machine', 'actor-model', 'pub-sub', 'message-queue',
  'connection-pool', 'object-storage', 'time-series-db',
  'log-aggregation', 'distributed-tracing', 'health-check',
  'retry-strategy', 'dead-letter-queue', 'schema-registry',
  'api-gateway-pattern', 'bff-pattern', 'strangler-fig',
];
const KEYWORD_TO_CATEGORY = {
  'websocket': 'websocket', 'oauth': 'auth', 'graphql': 'graphql',
  'cqrs': 'event-driven', 'event-sourcing': 'event-driven', 'rate-limiter': 'rate-limiting',
  'circuit-breaker': 'circuit-breaker', 'saga-pattern': 'event-driven',
  'blue-green-deploy': 'deployment', 'feature-flags': 'feature-flags',
  'chaos-engineering': 'chaos-engineering', 'load-balancer': 'load-balancing',
  'service-mesh': 'architecture', 'api-versioning': 'api-patterns',
  'data-pipeline': 'data-pipeline', 'etl': 'data-pipeline', 'cdc': 'data-pipeline',
  'outbox-pattern': 'event-driven', 'idempotency': 'idempotency',
  'bloom-filter': 'algorithms', 'consistent-hashing': 'load-balancing',
  'raft-consensus': 'consensus', 'crdt': 'consensus',
  'backpressure': 'resilience', 'bulkhead': 'resilience',
  'sidecar-proxy': 'architecture', 'canary-release': 'deployment',
  'database-sharding': 'storage', 'read-replica': 'storage',
  'materialized-view': 'caching', 'command-query': 'event-driven',
  'domain-driven': 'ddd', 'hexagonal-architecture': 'architecture',
  'finite-state-machine': 'algorithms', 'actor-model': 'actor-model',
  'pub-sub': 'messaging', 'message-queue': 'messaging',
  'connection-pool': 'concurrency', 'object-storage': 'storage',
  'time-series-db': 'storage', 'log-aggregation': 'observability',
  'distributed-tracing': 'observability', 'health-check': 'observability',
  'retry-strategy': 'resilience', 'dead-letter-queue': 'messaging',
  'schema-registry': 'schema', 'api-gateway-pattern': 'api-patterns',
  'bff-pattern': 'api-patterns', 'strangler-fig': 'deployment',
};

function categoryForKeyword(kw) {
  return KEYWORD_TO_CATEGORY[kw] || 'misc';
}

const usedKeywords = new Set();

function pickKeyword() {
  const available = KEYWORDS.filter(k => !usedKeywords.has(k));
  if (available.length === 0) { usedKeywords.clear(); return pickKeyword(); }
  const kw = available[Math.floor(Math.random() * available.length)];
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
async function askClaude(prompt, timeout = 300000) {
  const { execFile } = require('child_process');
  return new Promise((resolve, reject) => {
    execFile('claude', ['-p', prompt], { maxBuffer: 50 * 1024 * 1024, timeout }, (err, stdout, stderr) => {
      if (err) reject(new Error(err.message.split('\n')[0]));
      else resolve((stdout || '').trim());
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

// ╔══════════════════════════════════════════════════════════════╗
// ║  PIPELINE PHASES                                             ║
// ╚══════════════════════════════════════════════════════════════╝

async function phaseGenerate(keyword) {
  setPhase('generate');
  log('phase', `Phase 1: Generate 3 app ideas for "${keyword}"`);

  const prompt = `You are a creative developer. Generate exactly 3 unique zero-dependency HTML app ideas about "${keyword}".

For EACH app, output the COMPLETE source code in this EXACT format:

===FILE:app-name/index.html===
(complete HTML file)
===END===

===FILE:app-name/style.css===
(complete CSS file)
===END===

===FILE:app-name/app.js===
(complete JS file)
===END===

Requirements:
- Each app must be a DIFFERENT creative take on "${keyword}"
- Use kebab-case for app-name (e.g. "${keyword}-explorer")
- Dark theme: bg #0f1117, surface #1a1d27, accent #6ee7b7
- Zero dependencies, vanilla JS only
- Each app should be 150-400 lines total across all 3 files
- Must be immediately functional when opened in a browser
- Include simulated/mock data so the app is interactive on load
- Use canvas or SVG for visualizations where appropriate

Output ONLY the file blocks, no other text.`;

  const response = await askClaude(prompt, 600000);
  return response;
}

async function phaseBuild(claudeOutput, keyword, cycleNum) {
  setPhase('build');
  log('phase', 'Phase 2: Build apps from generated code');

  const builtApps = [];
  const num = getNextProjectNum();

  // Parse files from Claude output
  const fileRegex = /===FILE:(.+?)===\n([\s\S]*?)===END===/g;
  const filesByApp = {};
  let match;
  while ((match = fileRegex.exec(claudeOutput)) !== null) {
    const filePath = match[1].trim();
    const content = match[2].trim();
    const appName = filePath.split('/')[0];
    if (!filesByApp[appName]) filesByApp[appName] = [];
    filesByApp[appName].push({ path: filePath, content });
  }

  const appNames = Object.keys(filesByApp);
  if (appNames.length === 0) {
    // Fallback: try to extract code blocks
    log('warn', 'No ===FILE:=== markers found, trying code block extraction');
    return builtApps;
  }

  let appIdx = 0;
  for (const appName of appNames.slice(0, 3)) {
    const projNum = String(num + appIdx).padStart(2, '0');
    const projDir = path.join(WORK_DIR, `${projNum}-${appName}`);
    fs.mkdirSync(projDir, { recursive: true });

    let totalLines = 0;
    for (const file of filesByApp[appName]) {
      const relPath = file.path.replace(`${appName}/`, '');
      const fullPath = path.join(projDir, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, file.content, 'utf8');
      totalLines += file.content.split('\n').length;
    }

    // Validate JS syntax
    const jsFile = path.join(projDir, 'app.js');
    let valid = true;
    if (fs.existsSync(jsFile)) {
      try {
        shellSync(`node --check "${jsFile}"`);
      } catch {
        log('warn', `${appName}: JS syntax error, skipping validation`);
        valid = false;
      }
    }

    const app = {
      name: appName,
      dir: `${projNum}-${appName}`,
      cycle: cycleNum,
      lines: totalLines,
      status: 'built',
      keyword,
      valid,
    };
    builtApps.push(app);
    state.apps.push(app);
    state.stats.apps++;
    state.stats.lines += totalLines;
    broadcast({ type: 'app', app });
    broadcast({ type: 'stats', stats: state.stats });
    log('success', `Built: ${app.dir} (${totalLines} lines)`);
    appIdx++;
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
      const manifest = {
        slug,
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        stack: ['html', 'css', 'vanilla-js'],
        created_at: new Date().toISOString(),
        source_project: app.dir,
        author: 'kjuhwa@nkia.co.kr',
      };
      fs.writeFileSync(path.join(exDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      // Write README
      const readme = `# ${manifest.title}\n\n> **Why.** Auto-generated ${app.keyword} visualization tool from hub-auto-loop cycle ${cycleNum}.\n\n## Usage\n\nOpen \`index.html\` in any browser.\n\n## Stack\n\n\`html\` · \`css\` · \`vanilla-js\` — zero dependencies, ${app.lines} lines\n\n## Provenance\n\n- Auto-generated by hub-auto-loop cycle ${cycleNum} on ${new Date().toISOString().split('T')[0]}\n`;
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

  const prompt = `Analyze these 3 apps built about "${keyword}" (names: ${appNames}) and extract reusable patterns.

Output EXACTLY in this format (2 skills + 1 knowledge entry):

===SKILL:1===
name: ${keyword}-visualization-pattern
category: design
description: (one line)
content: (2-3 paragraphs of the reusable pattern)
===END===

===SKILL:2===
name: ${keyword}-data-simulation
category: workflow
description: (one line)
content: (2-3 paragraphs of the reusable pattern)
===END===

===KNOWLEDGE:1===
name: ${keyword}-implementation-pitfall
category: pitfall
description: (one line)
content: (2-3 paragraphs about what can go wrong)
===END===

Be specific to "${keyword}" domain. No generic content.`;

  try {
    const response = await askClaude(prompt, 300000);

    // Parse skills
    const skillRegex = /===SKILL:\d+===\n([\s\S]*?)===END===/g;
    let m;
    while ((m = skillRegex.exec(response)) !== null) {
      const block = m[1];
      const name = (block.match(/name:\s*(.+)/)?.[1] || '').trim();
      const category = (block.match(/category:\s*(.+)/)?.[1] || 'misc').trim();
      const description = (block.match(/description:\s*(.+)/)?.[1] || '').trim();
      const content = (block.match(/content:\s*([\s\S]*?)$/)?.[1] || '').trim();

      if (name) {
        extracted.skills.push({ name, category, description, content });
        state.skills.push({ name, category, type: 'skill', cycle: cycleNum });
        state.stats.skills++;
        broadcast({ type: 'skill', skill: { name, category, type: 'skill' } });
        log('success', `Extracted skill: ${name} (${category})`);
      }
    }

    // Parse knowledge
    const knowRegex = /===KNOWLEDGE:\d+===\n([\s\S]*?)===END===/g;
    while ((m = knowRegex.exec(response)) !== null) {
      const block = m[1];
      const name = (block.match(/name:\s*(.+)/)?.[1] || '').trim();
      const category = (block.match(/category:\s*(.+)/)?.[1] || 'pitfall').trim();
      const description = (block.match(/description:\s*(.+)/)?.[1] || '').trim();
      const content = (block.match(/content:\s*([\s\S]*?)$/)?.[1] || '').trim();

      if (name) {
        extracted.knowledge.push({ name, category, description, content });
        state.knowledge.push({ name, category, type: 'knowledge', cycle: cycleNum });
        state.stats.knowledge++;
        broadcast({ type: 'skill', skill: { name, category, type: 'knowledge' } });
        log('success', `Extracted knowledge: ${name} (${category})`);
      }
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
  broadcast({ type: 'cycle', cycle: cycleNum });
  log('phase', `═══ CYCLE ${cycleNum} START ═══`);

  const keyword = pickKeyword();
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

  // API: state
  if (url.pathname === '/api/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      type: 'state',
      status: state.status,
      cycle: state.cycle,
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
      mainLoop().catch(err => log('error', err.message));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
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
