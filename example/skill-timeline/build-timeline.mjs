#!/usr/bin/env node
// Walk git log on a skills-hub working copy → timeline.json
// (daily heatmap buckets, top-churned slugs, author/type breakdowns).
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
const SINCE = args.since || '1 year ago';
const OUT = path.join(HERE, 'timeline.json');

if (!fs.existsSync(path.join(ROOT, '.git'))) {
  console.error(`✗ not a git repo: ${ROOT}\n  pass --root=<hub working copy> or set HUB_REPO`);
  process.exit(2);
}

const MARK = '__C__';
const FS = '\u0002';
const fmt = MARK + ['%H', '%ai', '%an', '%s'].join(FS);
const raw = execSync(
  `git log --since="${SINCE}" --name-status --pretty=format:"${fmt}"`,
  { cwd: ROOT, maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' }
);

const classify = (p) => {
  const parts = p.split('/');
  if (parts[0] === 'skills' && parts.length >= 3) return { type: 'skill', slug: parts[2] };
  if (parts[0] === 'knowledge' && parts.length >= 3) return { type: 'knowledge', slug: parts[2] };
  if (parts[0] === 'example' && parts.length >= 2) return { type: 'example', slug: parts[1] };
  if (parts[0] === 'bootstrap') return { type: 'bootstrap', slug: parts[1] || 'root' };
  return { type: 'other', slug: parts[0] || 'root' };
};

const commits = [];
const daily = new Map();
const churn = new Map();
const authors = new Map();
const typeBuckets = new Map();
const statusCounts = { A: 0, M: 0, D: 0, R: 0, C: 0, T: 0 };

const bump = (m, k, n = 1) => m.set(k, (m.get(k) || 0) + n);

for (const rec of raw.split(MARK)) {
  if (!rec.trim()) continue;
  const nl = rec.indexOf('\n');
  const header = nl === -1 ? rec : rec.slice(0, nl);
  const body = nl === -1 ? '' : rec.slice(nl + 1);
  const [sha, ai, an, ...rest] = header.split(FS);
  if (!sha || !ai) continue;
  const subject = rest.join(FS);
  const day = ai.slice(0, 10);
  const files = [];
  for (const line of body.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    const status = parts[0][0];
    const target = parts[parts.length - 1];
    if (!target) continue;
    files.push({ s: status, p: target });
    if (status in statusCounts) statusCounts[status]++;
    const c = classify(target);
    bump(typeBuckets, c.type);
    bump(churn, `${c.type}:${c.slug}`);
  }
  commits.push({ sha: sha.slice(0, 10), day, author: an, subject, files: files.length });
  bump(daily, day);
  bump(authors, an);
}

const topChurn = [...churn.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 40)
  .map(([k, v]) => {
    const i = k.indexOf(':');
    return { type: k.slice(0, i), slug: k.slice(i + 1), count: v };
  });

const dailyArr = [...daily.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, v]) => ({ d, v }));

const totals = {
  commits: commits.length,
  filesChanged: commits.reduce((s, c) => s + c.files, 0),
  uniqueDays: daily.size,
  uniqueAuthors: authors.size,
  busiestDay: dailyArr.reduce((m, e) => (e.v > (m?.v || 0) ? e : m), null),
};

const out = {
  generatedAt: new Date().toISOString(),
  root: ROOT,
  since: SINCE,
  totals,
  statusCounts,
  typeBuckets: [...typeBuckets.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, v })),
  authors: [...authors.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, v })),
  daily: dailyArr,
  topChurn,
  recent: commits.slice(0, 30),
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`✓ timeline → timeline.json (${kb} KB) — ${totals.commits} commits, ${daily.size} days, ${authors.size} authors`);
