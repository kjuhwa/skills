#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SKILLS_DIR = path.join(ROOT, '.claude', 'skills');
const KNOW_DIR = path.join(ROOT, '.claude', 'knowledge');
const OUT = path.join(HERE, 'skills.json');

function parseFrontmatter(md) {
  if (!md.startsWith('---')) return { meta: {}, body: md };
  const end = md.indexOf('\n---', 3);
  if (end === -1) return { meta: {}, body: md };
  const fmRaw = md.slice(3, end).trim();
  const body = md.slice(end + 4).replace(/^\r?\n/, '');
  const meta = {};
  let currentKey = null, blockScalar = null, blockIndent = -1, blockLines = [];
  const flushBlock = () => {
    if (blockScalar) {
      meta[blockScalar] = blockLines.map(l => l.slice(blockIndent)).join(' ').replace(/\s+/g, ' ').trim();
      blockScalar = null; blockLines = []; blockIndent = -1;
    }
  };
  for (const line of fmRaw.split(/\r?\n/)) {
    if (blockScalar) {
      const lead = line.match(/^(\s*)/)[1].length;
      if (blockIndent === -1 && line.trim()) { blockIndent = lead; blockLines.push(line); continue; }
      if (line.trim() && lead >= blockIndent) { blockLines.push(line); continue; }
      flushBlock();
    }
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (!m) continue;
      const [, k, v] = m;
      currentKey = k;
      if (v === '|' || v === '>' || v === '|-' || v === '>-') {
        blockScalar = k; blockIndent = -1; blockLines = [];
      } else if (v === '') meta[k] = {};
      else if (v.startsWith('[') && v.endsWith(']')) {
        meta[k] = v.slice(1, -1)
          .split(',')
          .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      } else {
        meta[k] = v.replace(/^['"]|['"]$/g, '');
      }
    } else if (currentKey) {
      const trimmed = line.trim();
      const listItem = trimmed.match(/^-\s+(.*)$/);
      if (listItem) {
        if (!Array.isArray(meta[currentKey])) meta[currentKey] = [];
        meta[currentKey].push(listItem[1].replace(/^['"]|['"]$/g, ''));
        continue;
      }
      const sub = trimmed.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (sub) {
        if (typeof meta[currentKey] !== 'object' || Array.isArray(meta[currentKey])) {
          meta[currentKey] = {};
        }
        meta[currentKey][sub[1]] = sub[2].replace(/^['"]|['"]$/g, '');
      }
    }
  }
  flushBlock();
  return { meta, body };
}

function readIf(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

const skills = [];
if (fs.existsSync(SKILLS_DIR)) {
  for (const dir of fs.readdirSync(SKILLS_DIR).sort()) {
    const skillMd = path.join(SKILLS_DIR, dir, 'SKILL.md');
    if (!fs.existsSync(skillMd)) continue;
    const { meta, body } = parseFrontmatter(fs.readFileSync(skillMd, 'utf8'));
    const content = readIf(path.join(SKILLS_DIR, dir, 'content.md'));
    skills.push({
      type: 'skill',
      id: dir,
      name: meta.name || dir,
      description: meta.description || '',
      category: meta.category || 'uncategorized',
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      triggers: Array.isArray(meta.triggers) ? meta.triggers : [],
      source_project: meta.source_project || '',
      version: meta.version || '',
      body: body.trim(),
      content: content.trim(),
    });
  }
}

const knowledge = [];
if (fs.existsSync(KNOW_DIR)) {
  for (const cat of fs.readdirSync(KNOW_DIR).sort()) {
    const catPath = path.join(KNOW_DIR, cat);
    if (!fs.statSync(catPath).isDirectory()) continue;
    for (const file of fs.readdirSync(catPath).sort()) {
      if (!file.endsWith('.md')) continue;
      const full = path.join(catPath, file);
      const { meta, body } = parseFrontmatter(fs.readFileSync(full, 'utf8'));
      knowledge.push({
        type: 'knowledge',
        id: `${cat}/${file.replace(/\.md$/, '')}`,
        name: meta.name || file.replace(/\.md$/, ''),
        category: meta.category || cat,
        summary: meta.summary || '',
        source: typeof meta.source === 'object' ? meta.source : {},
        body: body.trim(),
      });
    }
  }
}

const catCount = (items, key = 'category') =>
  items.reduce((acc, x) => ((acc[x[key]] = (acc[x[key]] || 0) + 1), acc), {});

const payload = {
  generatedAt: new Date().toISOString(),
  counts: {
    skills: skills.length,
    knowledge: knowledge.length,
    total: skills.length + knowledge.length,
  },
  categories: {
    skills: catCount(skills),
    knowledge: catCount(knowledge),
  },
  skills,
  knowledge,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload));

const sizeKb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`✓ ${skills.length} skills + ${knowledge.length} knowledge → skills.json (${sizeKb} KB)`);
