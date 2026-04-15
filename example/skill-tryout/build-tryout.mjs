#!/usr/bin/env node
// Extract skill frontmatter (name/description/triggers/tags/category) from a
// hub working copy → skills.json so the browser can do offline trigger matching.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v === undefined ? true : v];
}));
const ROOT = path.resolve(args.root || path.join(HERE, '..'));
const SKILLS = path.join(ROOT, '.claude', 'skills');
const SKILLS_FLAT = path.join(ROOT, 'skills');
const OUT = path.join(HERE, 'skills.json');

function parseFm(md) {
  if (!md.startsWith('---')) return {};
  const end = md.indexOf('\n---', 3); if (end === -1) return {};
  const meta = {}; let cur = null, blockScalar = null, blockIndent = -1, blockLines = [];
  const flushBlock = () => { if (blockScalar) { meta[blockScalar] = blockLines.map(l => l.slice(blockIndent)).join(' ').replace(/\s+/g, ' ').trim(); blockScalar = null; blockLines = []; blockIndent = -1; } };
  for (const line of md.slice(3, end).split(/\r?\n/)) {
    if (blockScalar) {
      const lead = line.match(/^(\s*)/)[1].length;
      if (blockIndent === -1 && line.trim()) { blockIndent = lead; blockLines.push(line); continue; }
      if (line.trim() && lead >= blockIndent) { blockLines.push(line); continue; }
      flushBlock();
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
      const s = trimmed.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (s) { if (typeof meta[cur] !== 'object' || Array.isArray(meta[cur])) meta[cur] = {}; meta[cur][s[1]] = s[2].replace(/^['"]|['"]$/g, ''); }
    }
  }
  flushBlock();
  return meta;
}

const pick = (o, keys) => {
  const r = {};
  for (const k of keys) if (o[k] !== undefined) r[k] = o[k];
  return r;
};

const skills = [];
const collect = (fp, slug, cat) => {
  const m = parseFm(fs.readFileSync(fp, 'utf8'));
  const s = {
    slug,
    name: m.name || slug,
    description: m.description || '',
    triggers: Array.isArray(m.triggers) ? m.triggers : [],
    tags: Array.isArray(m.tags) ? m.tags : [],
    category: m.category || cat || 'uncategorized',
  };
  skills.push(s);
};

if (fs.existsSync(SKILLS)) {
  for (const dir of fs.readdirSync(SKILLS)) {
    const f = path.join(SKILLS, dir, 'SKILL.md');
    if (fs.existsSync(f)) collect(f, dir, null);
  }
}
if (fs.existsSync(SKILLS_FLAT)) {
  for (const cat of fs.readdirSync(SKILLS_FLAT)) {
    const cp = path.join(SKILLS_FLAT, cat);
    if (!fs.statSync(cp).isDirectory()) continue;
    for (const slug of fs.readdirSync(cp)) {
      const f = path.join(cp, slug, 'SKILL.md');
      if (fs.existsSync(f) && !skills.some(s => s.slug === slug)) collect(f, slug, cat);
    }
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  root: ROOT,
  count: skills.length,
  skills,
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`✓ tryout → skills.json (${kb} KB) — ${skills.length} skills indexed`);
