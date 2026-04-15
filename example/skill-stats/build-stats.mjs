#!/usr/bin/env node
// Aggregate SKILL.md + knowledge/*.md into stats.json for the dashboard.
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
const OUT    = path.join(HERE, 'stats.json');

function parseFm(md) {
  if (!md.startsWith('---')) return {};
  const end = md.indexOf('\n---', 3); if (end === -1) return {};
  const meta = {}; let cur = null;
  for (const line of md.slice(3, end).split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/); if (!m) continue; cur = m[1];
      const v = m[2];
      if (v === '') meta[cur] = {};
      else if (v.startsWith('[') && v.endsWith(']')) meta[cur] = v.slice(1,-1).split(',').map(s=>s.trim().replace(/^['"]|['"]$/g,'')).filter(Boolean);
      else meta[cur] = v.replace(/^['"]|['"]$/g,'');
    } else if (cur) {
      const s = line.trim().match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (s) { if (typeof meta[cur] !== 'object' || Array.isArray(meta[cur])) meta[cur] = {}; meta[cur][s[1]] = s[2].replace(/^['"]|['"]$/g,''); }
    }
  }
  return meta;
}

const bump = (map, k) => map.set(k, (map.get(k) || 0) + 1);
const toSorted = (map, limit) => [...map.entries()].sort((a,b) => b[1]-a[1]).slice(0, limit || Infinity).map(([k,v]) => ({ k, v }));

const catSkills = new Map(), catKnow = new Map();
const tagAll = new Map();
const sourceProjects = new Map();
const sourceRefs = new Map();
const triggers = new Map();
let skillsCount = 0, knowCount = 0;
let tagUsingSkills = 0, skillWithTriggers = 0, skillWithContent = 0;
let descLenTotal = 0, descCount = 0;

if (fs.existsSync(SKILLS)) {
  for (const dir of fs.readdirSync(SKILLS)) {
    const f = path.join(SKILLS, dir, 'SKILL.md');
    if (!fs.existsSync(f)) continue;
    skillsCount++;
    const m = parseFm(fs.readFileSync(f, 'utf8'));
    bump(catSkills, m.category || 'uncategorized');
    if (Array.isArray(m.tags) && m.tags.length) { tagUsingSkills++; for (const t of m.tags) bump(tagAll, t); }
    if (Array.isArray(m.triggers) && m.triggers.length) { skillWithTriggers++; for (const t of m.triggers) bump(triggers, t); }
    if (m.source_project) bump(sourceProjects, m.source_project);
    if (typeof m.description === 'string' && m.description.length) { descLenTotal += m.description.length; descCount++; }
    if (fs.existsSync(path.join(SKILLS, dir, 'content.md'))) skillWithContent++;
  }
}
if (fs.existsSync(KNOW)) {
  for (const cat of fs.readdirSync(KNOW)) {
    const cp = path.join(KNOW, cat);
    if (!fs.statSync(cp).isDirectory()) continue;
    for (const file of fs.readdirSync(cp)) {
      if (!file.endsWith('.md')) continue;
      knowCount++;
      const m = parseFm(fs.readFileSync(path.join(cp, file), 'utf8'));
      bump(catKnow, m.category || cat);
      if (Array.isArray(m.tags)) for (const t of m.tags) bump(tagAll, t);
      const ref = m.source && m.source.ref;
      if (ref) bump(sourceRefs, String(ref).split('@')[0]);
    }
  }
}

const stats = {
  generatedAt: new Date().toISOString(),
  totals: {
    skills: skillsCount, knowledge: knowCount,
    skillsWithTriggers: skillWithTriggers,
    skillsWithContentMd: skillWithContent,
    skillsWithTags: tagUsingSkills,
    uniqueTags: tagAll.size,
    uniqueSourceProjects: sourceProjects.size,
    uniqueSourceRefs: sourceRefs.size,
    avgDescriptionLen: descCount ? Math.round(descLenTotal / descCount) : 0,
  },
  categoriesSkills: toSorted(catSkills),
  categoriesKnowledge: toSorted(catKnow),
  topTags: toSorted(tagAll, 30),
  topSourceProjects: toSorted(sourceProjects, 20),
  topSourceRefs: toSorted(sourceRefs, 20),
  topTriggers: toSorted(triggers, 15),
};

fs.writeFileSync(OUT, JSON.stringify(stats, null, 2));
const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`✓ stats → stats.json (${kb} KB) — ${skillsCount} skills, ${knowCount} knowledge, ${tagAll.size} unique tags, ${sourceProjects.size} projects`);
