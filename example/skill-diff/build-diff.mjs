#!/usr/bin/env node
// Compare two refs of a skills-hub working copy → diff.json
// Classifies changes into added/removed/modified × (skill|knowledge|example|bootstrap|other)
// and captures before/after description + triggers for modified SKILL.md files.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v === undefined ? true : v];
}));
const ROOT = path.resolve(args.root || process.env.HUB_REPO || path.join(process.env.USERPROFILE || process.env.HOME || '.', '.claude', 'skills-hub', 'remote'));
const FROM = args.from || 'HEAD~20';
const TO = args.to || 'HEAD';
const OUT = path.join(HERE, 'diff.json');

if (!fs.existsSync(path.join(ROOT, '.git'))) {
  console.error(`✗ not a git repo: ${ROOT}\n  pass --root=<hub working copy> or set HUB_REPO`);
  process.exit(2);
}

const git = (cmd) => execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const safeShow = (ref, p) => {
  try { return execSync(`git show ${ref}:"${p}"`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch { return null; }
};

const fromSha = git(`rev-parse ${FROM}`).trim();
const toSha = git(`rev-parse ${TO}`).trim();
const fromDate = git(`show -s --format=%ai ${FROM}`).trim();
const toDate = git(`show -s --format=%ai ${TO}`).trim();

const raw = git(`diff --name-status ${FROM}..${TO}`);

const classify = (p) => {
  const parts = p.split('/');
  if (parts[0] === 'skills' && parts.length >= 3) return { kind: 'skill', slug: parts[2], category: parts[1] };
  if (parts[0] === 'knowledge' && parts.length >= 3) return { kind: 'knowledge', slug: parts[2], category: parts[1] };
  if (parts[0] === 'example' && parts.length >= 2) return { kind: 'example', slug: parts[1] };
  if (parts[0] === 'bootstrap') return { kind: 'bootstrap', slug: parts.slice(1).join('/') || 'root' };
  return { kind: 'other', slug: parts[0] };
};

function parseFm(md) {
  if (!md || !md.startsWith('---')) return {};
  const end = md.indexOf('\n---', 3); if (end === -1) return {};
  const meta = {}; let cur = null, blockScalar = null, blockIndent = -1, blockLines = [];
  const flush = () => { if (blockScalar) { meta[blockScalar] = blockLines.map(l => l.slice(blockIndent)).join(' ').replace(/\s+/g, ' ').trim(); blockScalar = null; blockLines = []; blockIndent = -1; } };
  for (const line of md.slice(3, end).split(/\r?\n/)) {
    if (blockScalar) {
      const lead = line.match(/^(\s*)/)[1].length;
      if (blockIndent === -1 && line.trim()) { blockIndent = lead; blockLines.push(line); continue; }
      if (line.trim() && lead >= blockIndent) { blockLines.push(line); continue; }
      flush();
    }
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/); if (!m) continue; cur = m[1];
      const v = m[2];
      if (v === '|' || v === '>' || v === '|-' || v === '>-') { blockScalar = cur; blockIndent = -1; blockLines = []; }
      else if (v === '') meta[cur] = {};
      else if (v.startsWith('[') && v.endsWith(']')) meta[cur] = v.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
      else meta[cur] = v.replace(/^['"]|['"]$/g, '');
    } else if (cur) {
      const trimmed = line.trim();
      const li = trimmed.match(/^-\s+(.*)$/);
      if (li) { if (!Array.isArray(meta[cur])) meta[cur] = []; meta[cur].push(li[1].replace(/^['"]|['"]$/g, '')); continue; }
    }
  }
  flush();
  return meta;
}

// Aggregate file-level status into per-slug entries.
const entries = new Map();   // key = kind:slug → { kind, slug, category, status:'A'|'M'|'D', files:[{s,p}] }
const other = [];
const tallyTags = { added: new Map(), removed: new Map() };

const bump = (m, k, n = 1) => m.set(k, (m.get(k) || 0) + n);

for (const line of raw.split('\n')) {
  if (!line.trim()) continue;
  const parts = line.split('\t');
  const status = parts[0][0];
  const target = parts[parts.length - 1];
  const c = classify(target);
  if (c.kind === 'other') { other.push({ status, path: target }); continue; }
  const key = `${c.kind}:${c.slug}`;
  if (!entries.has(key)) entries.set(key, { kind: c.kind, slug: c.slug, category: c.category, status: null, files: [] });
  const e = entries.get(key);
  e.files.push({ s: status, p: target });
  e.status = !e.status ? status : (e.status === status ? status : 'M');
}

const enriched = [];
for (const e of entries.values()) {
  const out = { ...e };
  const skillMd = e.files.find(f => f.p.endsWith('SKILL.md') || f.p.endsWith('/content.md') || f.p.endsWith('.md'));
  if (skillMd && (e.kind === 'skill' || e.kind === 'knowledge')) {
    const primary = e.files.find(f => f.p.endsWith('SKILL.md')) || skillMd;
    const before = out.status === 'A' ? null : parseFm(safeShow(FROM, primary.p));
    const after = out.status === 'D' ? null : parseFm(safeShow(TO, primary.p));
    out.before = before && { description: before.description || '', triggers: before.triggers || [], tags: before.tags || [], category: before.category || e.category };
    out.after = after && { description: after.description || '', triggers: after.triggers || [], tags: after.tags || [], category: after.category || e.category };
    if (out.after && !out.before) for (const t of out.after.tags) bump(tallyTags.added, t);
    if (out.before && !out.after) for (const t of out.before.tags) bump(tallyTags.removed, t);
  }
  enriched.push(out);
}

const bucket = (status) => enriched.filter(e => e.status === status).sort((a, b) => a.slug.localeCompare(b.slug));

const out = {
  generatedAt: new Date().toISOString(),
  root: ROOT,
  range: { from: FROM, to: TO, fromSha: fromSha.slice(0, 10), toSha: toSha.slice(0, 10), fromDate, toDate },
  totals: {
    added: enriched.filter(e => e.status === 'A').length,
    modified: enriched.filter(e => e.status === 'M').length,
    removed: enriched.filter(e => e.status === 'D').length,
    byKind: ['skill', 'knowledge', 'example', 'bootstrap'].map(k => ({
      k,
      added: enriched.filter(e => e.kind === k && e.status === 'A').length,
      modified: enriched.filter(e => e.kind === k && e.status === 'M').length,
      removed: enriched.filter(e => e.kind === k && e.status === 'D').length,
    })),
    otherFiles: other.length,
  },
  added: bucket('A'),
  modified: bucket('M'),
  removed: bucket('D'),
  tagDelta: {
    added: [...tallyTags.added.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => ({ k, v })),
    removed: [...tallyTags.removed.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => ({ k, v })),
  },
  otherSample: other.slice(0, 20),
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`✓ diff → diff.json (${kb} KB) — ${FROM}(${fromSha.slice(0, 7)}) → ${TO}(${toSha.slice(0, 7)}) · +${out.totals.added} ~${out.totals.modified} -${out.totals.removed}`);
