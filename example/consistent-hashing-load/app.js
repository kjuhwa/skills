const $ = id => document.getElementById(id);
let nodeCount, keyCount, prevMod = {}, prevCon = {};

function fnv(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }

function modHash(keys, n) { const m = {}; for (let i = 0; i < n; i++) m[i] = 0; keys.forEach(k => { m[fnv(k) % n]++; }); return m; }

function conHash(keys, n) {
  const ring = [], m = {};
  for (let i = 0; i < n; i++) { m[i] = 0; for (let v = 0; v < 150; v++) ring.push({ pos: fnv('n' + i + 'v' + v), node: i }); }
  ring.sort((a, b) => a.pos - b.pos);
  keys.forEach(k => {
    const h = fnv(k); let found = false;
    for (const r of ring) { if (r.pos >= h) { m[r.node]++; found = true; break; } }
    if (!found) m[ring[0].node]++;
  });
  return m;
}

function renderBars(el, dist, total) {
  const max = Math.max(...Object.values(dist), 1);
  el.innerHTML = Object.entries(dist).map(([k, v]) =>
    `<div class="bar-row"><span class="bar-label">N${k}</span><div class="bar" style="width:${(v/max)*100}%;background:#6ee7b7"></div><span class="bar-val">${v}</span></div>`
  ).join('');
}

function remapped(prev, curr) {
  if (!Object.keys(prev).length) return 0;
  let moved = 0, total = Object.values(curr).reduce((a, b) => a + b, 0);
  return total;
}

function simulate() {
  nodeCount = +$('nodeCount').value; keyCount = +$('keyCount').value;
  const keys = Array.from({ length: keyCount }, (_, i) => 'key-' + i);
  const md = modHash(keys, nodeCount), cd = conHash(keys, nodeCount);
  renderBars($('modBars'), md, keyCount);
  renderBars($('conBars'), cd, keyCount);
  const vals = Object.values(cd), avg = keyCount / nodeCount;
  const stddev = Math.sqrt(vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length);
  $('modStat').innerHTML = `Std dev: <b>${Math.sqrt(Object.values(md).reduce((s, v) => s + (v - avg) ** 2, 0) / nodeCount).toFixed(1)}</b>`;
  $('conStat').innerHTML = `Std dev: <b>${stddev.toFixed(1)}</b> (150 vnodes)`;
  prevMod = md; prevCon = cd;
}

$('simulate').onclick = simulate;
$('removeOne').onclick = () => {
  if (+$('nodeCount').value > 2) {
    const keys = Array.from({ length: +$('keyCount').value }, (_, i) => 'key-' + i);
    const oldN = +$('nodeCount').value, newN = oldN - 1;
    const oldMod = modHash(keys, oldN), newMod = modHash(keys, newN);
    const oldCon = conHash(keys, oldN), newCon = conHash(keys, newN);
    $('nodeCount').value = newN;
    let modMoved = 0, conMoved = 0;
    keys.forEach(k => { if (fnv(k) % oldN !== fnv(k) % newN) modMoved++; });
    renderBars($('modBars'), newMod, +$('keyCount').value);
    renderBars($('conBars'), newCon, +$('keyCount').value);
    $('modStat').innerHTML = `Keys remapped: <b>${modMoved}</b> / ${keys.length}`;
    $('conStat').innerHTML = `Keys remapped: <b>~${Math.round(keys.length / oldN)}</b> / ${keys.length} (ideal)`;
  }
};
simulate();