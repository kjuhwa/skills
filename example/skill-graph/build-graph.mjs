#!/usr/bin/env node
// Build graph.json — nodes (skills + knowledge) and edges (shared tags / shared source).
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
const KNOW   = path.join(ROOT, '.claude', 'knowledge');
const OUT    = path.join(HERE, 'graph.json');

function parseFm(md) {
  if (!md.startsWith('---')) return {};
  const end = md.indexOf('\n---', 3);
  if (end === -1) return {};
  const meta = {}; let cur = null, blockScalar = null, blockIndent = -1, blockLines = [];
  const flushBlock = () => { if (blockScalar) { meta[blockScalar] = blockLines.map(l=>l.slice(blockIndent)).join(' ').replace(/\s+/g,' ').trim(); blockScalar=null; blockLines=[]; blockIndent=-1; } };
  for (const line of md.slice(3, end).split(/\r?\n/)) {
    if (blockScalar) {
      const lead = line.match(/^(\s*)/)[1].length;
      if (blockIndent === -1 && line.trim()) { blockIndent = lead; blockLines.push(line); continue; }
      if (line.trim() && lead >= blockIndent) { blockLines.push(line); continue; }
      flushBlock();
    }
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (!m) continue; cur = m[1];
      const v = m[2];
      if (v === '|' || v === '>' || v === '|-' || v === '>-') { blockScalar = cur; blockIndent = -1; blockLines = []; }
      else if (v === '') meta[cur] = {};
      else if (v.startsWith('[') && v.endsWith(']')) {
        meta[cur] = v.slice(1,-1).split(',').map(s=>s.trim().replace(/^['"]|['"]$/g,'')).filter(Boolean);
      } else meta[cur] = v.replace(/^['"]|['"]$/g,'');
    } else if (cur) {
      const trimmed = line.trim();
      const li = trimmed.match(/^-\s+(.*)$/);
      if (li) { if (!Array.isArray(meta[cur])) meta[cur] = []; meta[cur].push(li[1].replace(/^['"]|['"]$/g,'')); continue; }
      const s = trimmed.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (s) { if (typeof meta[cur] !== 'object' || Array.isArray(meta[cur])) meta[cur] = {}; meta[cur][s[1]] = s[2].replace(/^['"]|['"]$/g,''); }
    }
  }
  flushBlock();
  return meta;
}

const nodes = [];

if (fs.existsSync(SKILLS)) {
  for (const dir of fs.readdirSync(SKILLS).sort()) {
    const f = path.join(SKILLS, dir, 'SKILL.md');
    if (!fs.existsSync(f)) continue;
    const m = parseFm(fs.readFileSync(f, 'utf8'));
    nodes.push({
      id: `s:${dir}`, type: 'skill', name: m.name || dir,
      category: m.category || 'uncategorized',
      tags: Array.isArray(m.tags) ? m.tags : [],
      source: m.source_project || '',
      description: m.description || '',
    });
  }
}
if (fs.existsSync(KNOW)) {
  for (const cat of fs.readdirSync(KNOW).sort()) {
    const cp = path.join(KNOW, cat);
    if (!fs.statSync(cp).isDirectory()) continue;
    for (const file of fs.readdirSync(cp).sort()) {
      if (!file.endsWith('.md')) continue;
      const m = parseFm(fs.readFileSync(path.join(cp, file), 'utf8'));
      const base = file.replace(/\.md$/, '');
      nodes.push({
        id: `k:${cat}/${base}`, type: 'knowledge', name: m.name || m.slug || base,
        category: m.category || cat,
        tags: Array.isArray(m.tags) ? m.tags : [],
        source: (m.source && typeof m.source === 'object') ? (m.source.ref || '') : '',
        description: m.summary || m.description || '',
      });
    }
  }
}

// ── edges ──
// (a) shared-tag edges: weight = # shared tags (min 2)
// (b) shared-source edges: weight = 1 (kind=source)
// Cap per-node degree to top-K to keep the graph tractable.
const EDGE_CAP_PER_NODE = 6;
const SHARED_TAG_MIN = 2;

const tagToNodes = new Map();
for (const n of nodes) for (const t of n.tags) {
  if (!tagToNodes.has(t)) tagToNodes.set(t, []);
  tagToNodes.get(t).push(n.id);
}
const pairScore = new Map(); // "a|b" (a<b) → {tag, source}
const bump = (a, b, kind) => {
  if (a === b) return;
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  const entry = pairScore.get(key) || { tag: 0, source: 0 };
  entry[kind] += 1;
  pairScore.set(key, entry);
};
for (const ids of tagToNodes.values()) {
  if (ids.length < 2 || ids.length > 40) continue; // super-common tags are noise
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) bump(ids[i], ids[j], 'tag');
}
const sourceToNodes = new Map();
for (const n of nodes) {
  if (!n.source) continue;
  if (!sourceToNodes.has(n.source)) sourceToNodes.set(n.source, []);
  sourceToNodes.get(n.source).push(n.id);
}
for (const ids of sourceToNodes.values()) {
  if (ids.length < 2 || ids.length > 40) continue;
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) bump(ids[i], ids[j], 'source');
}

let rawEdges = [];
for (const [key, s] of pairScore) {
  if (s.tag < SHARED_TAG_MIN && s.source === 0) continue;
  const [a, b] = key.split('|');
  rawEdges.push({ source: a, target: b, tag: s.tag, src: s.source, weight: s.tag + s.source * 2 });
}

// cap per-node
const degree = new Map();
rawEdges.sort((a, b) => b.weight - a.weight);
const edges = [];
for (const e of rawEdges) {
  const da = degree.get(e.source) || 0;
  const db = degree.get(e.target) || 0;
  if (da >= EDGE_CAP_PER_NODE || db >= EDGE_CAP_PER_NODE) continue;
  edges.push(e);
  degree.set(e.source, da + 1);
  degree.set(e.target, db + 1);
}

fs.writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(),
  counts: { nodes: nodes.length, edges: edges.length },
  nodes, edges,
}));

const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`✓ ${nodes.length} nodes · ${edges.length} edges → graph.json (${kb} KB)`);
