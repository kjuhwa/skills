// Simplified LSEQ-style CRDT: each char gets an id (path, site, clock)
let clock = { alice: 0, bob: 0 };
let docs = { alice: [], bob: [] };

const seed = (() => {
  const base = "Hello world";
  const ops = [];
  for (let i = 0; i < base.length; i++) {
    ops.push({ path: [i + 1], site: 'alice', clock: i, ch: base[i] });
  }
  clock.alice = base.length;
  return ops;
})();
docs.alice = [...seed];
docs.bob = [...seed];

function cmpId(a, b) {
  const len = Math.max(a.path.length, b.path.length);
  for (let i = 0; i < len; i++) {
    const av = a.path[i] ?? 0, bv = b.path[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  if (a.site !== b.site) return a.site < b.site ? -1 : 1;
  return a.clock - b.clock;
}

function genPath(left, right) {
  const la = left ? left.path : [0];
  const ra = right ? right.path : [65536];
  const depth = Math.max(la.length, ra.length);
  for (let i = 0; i < depth; i++) {
    const l = la[i] ?? 0, r = ra[i] ?? 65536;
    if (r - l > 1) {
      const p = la.slice(0, i);
      p.push(l + 1 + Math.floor(Math.random() * (r - l - 1)));
      return p;
    }
  }
  return [...la, 1 + Math.floor(Math.random() * 65535)];
}

function textFromDoc(doc) {
  return [...doc].sort(cmpId).map(op => op.ch).join('');
}

function diffAndApply(site, newText) {
  const sorted = [...docs[site]].sort(cmpId);
  const oldText = sorted.map(o => o.ch).join('');
  if (oldText === newText) return;
  // naive: find common prefix & suffix, rebuild middle
  let pre = 0;
  while (pre < oldText.length && pre < newText.length && oldText[pre] === newText[pre]) pre++;
  let suf = 0;
  while (
    suf < oldText.length - pre &&
    suf < newText.length - pre &&
    oldText[oldText.length - 1 - suf] === newText[newText.length - 1 - suf]
  ) suf++;
  const removeCount = oldText.length - pre - suf;
  const insertText = newText.slice(pre, newText.length - suf);

  const removedIds = sorted.slice(pre, pre + removeCount).map(o => o);
  docs[site] = docs[site].filter(op => !removedIds.includes(op));

  const resorted = [...docs[site]].sort(cmpId);
  let leftOp = resorted[pre - 1] || null;
  let rightOp = resorted[pre] || null;
  for (const ch of insertText) {
    const path = genPath(leftOp, rightOp);
    const op = { path, site, clock: clock[site]++, ch };
    docs[site].push(op);
    leftOp = op;
  }
  renderOps(site);
}

function renderOps(site) {
  const el = document.getElementById('ops-' + site);
  const sorted = [...docs[site]].sort(cmpId).slice(-8);
  el.innerHTML = sorted.map(o =>
    `<div>[${o.site[0]}${o.clock}] "${o.ch === ' ' ? '␣' : o.ch}" @ ${o.path.join('.')}</div>`
  ).join('');
}

function merge() {
  const byKey = new Map();
  for (const op of [...docs.alice, ...docs.bob]) {
    byKey.set(op.site + ':' + op.clock, op);
  }
  const all = [...byKey.values()].sort(cmpId);
  const mergedEl = document.getElementById('merged');
  mergedEl.innerHTML = all.map(o =>
    `<span class="ins-${o.site[0]}">${o.ch === '\n' ? '<br>' : o.ch}</span>`
  ).join('');
  docs.alice = [...all];
  docs.bob = [...all];
  document.getElementById('alice').value = textFromDoc(docs.alice);
  document.getElementById('bob').value = textFromDoc(docs.bob);
  renderOps('alice');
  renderOps('bob');
}

document.getElementById('alice').addEventListener('input', e => diffAndApply('alice', e.target.value));
document.getElementById('bob').addEventListener('input', e => diffAndApply('bob', e.target.value));
document.getElementById('merge').addEventListener('click', merge);

document.getElementById('alice').value = textFromDoc(docs.alice);
document.getElementById('bob').value = textFromDoc(docs.bob);
renderOps('alice');
renderOps('bob');
merge();