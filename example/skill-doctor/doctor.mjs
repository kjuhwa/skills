#!/usr/bin/env node
// skill-doctor — lint every SKILL.md + knowledge/*.md in a skills-hub working copy.
// Usage: node doctor.mjs [--root=<path>] [--json] [--fix-dry-run]
// Exit codes: 0 = clean, 1 = warnings, 2 = errors.

import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    if (!a.startsWith('--')) return [a, true];
    const [k, v] = a.slice(2).split('=');
    return [k, v === undefined ? true : v];
  })
);
const ROOT = path.resolve(args.root || process.cwd());
const SKILLS = path.join(ROOT, '.claude', 'skills');
const KNOW   = path.join(ROOT, '.claude', 'knowledge');

const SEVERITY = { error: 2, warn: 1, info: 0 };
const findings = [];
const report = (sev, file, rule, msg) => findings.push({ sev, file: path.relative(ROOT, file), rule, msg });

function parseFrontmatter(md) {
  if (!md.startsWith('---')) return { meta: null, body: md, fmRaw: '' };
  const end = md.indexOf('\n---', 3);
  if (end === -1) return { meta: null, body: md, fmRaw: md.slice(3) };
  const fmRaw = md.slice(3, end).trim();
  const body = md.slice(end + 4).replace(/^\r?\n/, '');
  const meta = {};
  let cur = null;
  for (const line of fmRaw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (!m) continue;
      cur = m[1];
      const v = m[2];
      if (v === '') meta[cur] = {};
      else if (v.startsWith('[') && v.endsWith(']')) {
        meta[cur] = v.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
      } else meta[cur] = v.replace(/^['"]|['"]$/g, '');
    } else if (cur) {
      const sub = line.trim().match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (sub) {
        if (typeof meta[cur] !== 'object' || Array.isArray(meta[cur])) meta[cur] = {};
        meta[cur][sub[1]] = sub[2].replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return { meta, body, fmRaw };
}

const SKILL_REQUIRED = ['name', 'description', 'category'];
const KNOW_REQUIRED  = ['name', 'category', 'summary'];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const seenSkillNames = new Map();
const seenKnowNames  = new Map();
let skillsScanned = 0, knowScanned = 0;

if (fs.existsSync(SKILLS)) {
  for (const dir of fs.readdirSync(SKILLS).sort()) {
    const dirPath = path.join(SKILLS, dir);
    if (!fs.statSync(dirPath).isDirectory()) continue;
    const skillMd = path.join(dirPath, 'SKILL.md');
    if (!fs.existsSync(skillMd)) { report('error', dirPath, 'missing-skill-md', 'SKILL.md not found'); continue; }
    skillsScanned++;
    const raw = fs.readFileSync(skillMd, 'utf8');
    const { meta, body } = parseFrontmatter(raw);

    if (!meta) { report('error', skillMd, 'no-frontmatter', 'missing or malformed YAML frontmatter'); continue; }
    for (const k of SKILL_REQUIRED) {
      if (!meta[k] || (typeof meta[k] === 'string' && !meta[k].trim())) {
        report('error', skillMd, 'frontmatter-required', `missing required field: ${k}`);
      }
    }
    if (meta.name && meta.name !== dir) report('warn', skillMd, 'name-mismatch', `frontmatter name "${meta.name}" != folder "${dir}"`);
    if (meta.name && !KEBAB.test(meta.name)) report('warn', skillMd, 'non-kebab-name', `name "${meta.name}" is not kebab-case`);
    if (meta.description && meta.description.length < 20) report('warn', skillMd, 'short-description', `description is only ${meta.description.length} chars`);
    if (meta.description && meta.description.length > 400) report('info', skillMd, 'long-description', `description is ${meta.description.length} chars (>400)`);
    if (meta.tags && !Array.isArray(meta.tags)) report('warn', skillMd, 'tags-not-array', 'tags should be a YAML array');

    if (meta.name) {
      const prev = seenSkillNames.get(meta.name);
      if (prev) report('error', skillMd, 'duplicate-name', `name "${meta.name}" already used in ${path.relative(ROOT, prev)}`);
      else seenSkillNames.set(meta.name, skillMd);
    }

    const contentMd = path.join(dirPath, 'content.md');
    const bodyRefsContent = /see\s+`?content\.md`?/i.test(body);
    if (!fs.existsSync(contentMd)) {
      if (bodyRefsContent) report('error', skillMd, 'content-md-missing', 'SKILL.md references content.md but file missing');
      else if (body.trim().length < 40) report('warn', skillMd, 'stub-without-content', 'SKILL.md body is tiny and no content.md present');
    } else {
      const contentRaw = fs.readFileSync(contentMd, 'utf8');
      if (contentRaw.trim().length < 40) report('warn', contentMd, 'empty-content-md', 'content.md is effectively empty');
    }

    // Dead internal reference check: explicit cross-skill prose references only.
    // Match patterns like "see `name`" / "apply `name`" / "use `name`" where `name`
    // looks like a skill slug (>=3 kebab segments, length >= 15).
    const refRe = /\b(?:see|apply|invoke|uses?|refer\s+to|per)\s+`([a-z][a-z0-9-]{14,})`/gi;
    for (const m of body.matchAll(refRe)) {
      const ref = m[1];
      if (ref === meta.name) continue;
      if ((ref.match(/-/g) || []).length < 2) continue;
      (doctor.pending ||= []).push({ file: skillMd, ref });
    }
  }
}

function doctor() {} // placeholder for pending bucket

if (fs.existsSync(KNOW)) {
  for (const cat of fs.readdirSync(KNOW).sort()) {
    const catPath = path.join(KNOW, cat);
    if (!fs.statSync(catPath).isDirectory()) continue;
    for (const file of fs.readdirSync(catPath).sort()) {
      if (!file.endsWith('.md')) continue;
      knowScanned++;
      const full = path.join(catPath, file);
      const raw = fs.readFileSync(full, 'utf8');
      const { meta } = parseFrontmatter(raw);
      if (!meta) { report('error', full, 'no-frontmatter', 'missing frontmatter'); continue; }
      const base = file.replace(/\.md$/, '');
      const nameLike = meta.name || meta.slug || base;
      const desc = meta.summary || meta.description;
      if (!meta.category) report('error', full, 'frontmatter-required', 'missing required field: category');
      if (!desc) report('error', full, 'frontmatter-required', 'missing required field: summary (or description)');
      if (meta.category && meta.category !== cat) report('warn', full, 'category-mismatch', `frontmatter category "${meta.category}" != folder "${cat}"`);
      if ((meta.name || meta.slug) && nameLike !== base) report('warn', full, 'name-mismatch', `frontmatter name/slug "${nameLike}" != file "${base}"`);
      const prev = seenKnowNames.get(nameLike);
      if (prev) report('error', full, 'duplicate-name', `name "${nameLike}" already used in ${path.relative(ROOT, prev)}`);
      else seenKnowNames.set(nameLike, full);
      if (meta.summary && meta.summary.length < 20) report('warn', full, 'short-summary', `summary is only ${meta.summary.length} chars`);
      if (raw.trim().length < 120) report('warn', full, 'thin-body', 'knowledge body is thin (<120 chars total)');
    }
  }
}

// Resolve pending backtick references now that we have the full name set
if (doctor.pending) {
  for (const { file, ref } of doctor.pending) {
    if (!seenSkillNames.has(ref) && !seenKnowNames.has(ref)) {
      report('info', file, 'possible-dead-ref', `backtick identifier "${ref}" doesn't match any skill/knowledge name`);
    }
  }
}

// ── render ──
const counts = { error: 0, warn: 0, info: 0 };
for (const f of findings) counts[f.sev]++;

if (args.json) {
  console.log(JSON.stringify({
    root: ROOT, skillsScanned, knowScanned,
    counts, findings,
  }, null, 2));
} else {
  const C = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m', dim: '\x1b[2m', reset: '\x1b[0m', bold: '\x1b[1m' };
  const color = !process.stdout.isTTY ? Object.fromEntries(Object.keys(C).map(k => [k, ''])) : C;

  const grouped = findings.reduce((acc, f) => ((acc[f.file] ||= []).push(f), acc), {});
  for (const file of Object.keys(grouped).sort()) {
    console.log(`\n${color.bold}${file}${color.reset}`);
    for (const f of grouped[file]) {
      const tag = { error: 'ERROR', warn: ' WARN', info: ' INFO' }[f.sev];
      console.log(`  ${color[f.sev]}${tag}${color.reset} ${color.dim}${f.rule}${color.reset}  ${f.msg}`);
    }
  }
  console.log(`\n${color.bold}━━━ summary ━━━${color.reset}`);
  console.log(`  scanned  ${skillsScanned} skills · ${knowScanned} knowledge`);
  console.log(`  ${color.error}errors ${counts.error}${color.reset} · ${color.warn}warnings ${counts.warn}${color.reset} · ${color.info}info ${counts.info}${color.reset}`);
}

process.exit(counts.error > 0 ? 2 : counts.warn > 0 ? 1 : 0);
