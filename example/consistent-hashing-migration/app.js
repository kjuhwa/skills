const colors = ['#6ee7b7','#60a5fa','#fbbf24','#a78bfa','#fb923c','#f472b6'];
let nodes = ['A','B','C'];
const allKeys = Array.from({length: 30}, (_, i) => 'key-' + i);

function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) & 0xffffffff; return h >>> 0; }

function assign(keyList, nodeList) {
  const map = {};
  nodeList.forEach(n => map[n] = []);
  const sorted = nodeList.map(n => ({ n, h: hash(n) })).sort((a, b) => a.h - b.h);
  keyList.forEach(k => {
    const kh = hash(k);
    let owner = sorted[0].n;
    for (const s of sorted) { if (s.h >= kh) { owner = s.n; break; } }
    map[owner].push(k);
  });
  return map;
}

function render(containerId, mapping, migratedSet) {
  const el = document.getElementById(containerId);
  el.innerHTML = `<div style="font-size:.75rem;color:#64748b;margin-bottom:8px">${containerId === 'before' ? 'Before' : 'After'}</div>`;
  Object.entries(mapping).forEach(([n, ks], i) => {
    const div = document.createElement('div'); div.className = 'node-group';
    div.innerHTML = `<div class="node-label" style="color:${colors[i % colors.length]}">${n} (${ks.length})</div>`;
    ks.forEach(k => {
      const chip = document.createElement('span'); chip.className = 'key-chip' + (migratedSet && migratedSet.has(k) ? ' migrated' : '');
      chip.style.background = colors[i % colors.length] + '22'; chip.style.color = colors[i % colors.length]; chip.textContent = k; div.appendChild(chip);
    });
    el.appendChild(div);
  });
}

function update(newNodes) {
  const before = assign(allKeys, nodes);
  const after = assign(allKeys, newNodes);
  const migrated = new Set();
  allKeys.forEach(k => {
    const bOwner = Object.entries(before).find(([, v]) => v.includes(k))?.[0];
    const aOwner = Object.entries(after).find(([, v]) => v.includes(k))?.[0];
    if (bOwner !== aOwner) migrated.add(k);
  });
  render('before', before, null);
  render('after', after, migrated);
  document.getElementById('stats').textContent = `Migrated: ${migrated.size}/${allKeys.length} keys (${(migrated.size/allKeys.length*100).toFixed(1)}%) — Nodes: ${nodes.length} → ${newNodes.length}`;
  nodes = newNodes;
}

document.getElementById('addBtn').onclick = () => { const nn = [...nodes, String.fromCharCode(65 + nodes.length)]; update(nn); };
document.getElementById('rmBtn').onclick = () => { if (nodes.length > 1) { const nn = nodes.slice(0, -1); update(nn); } };
document.getElementById('resetBtn').onclick = () => { nodes = ['A','B','C']; update(nodes); };
update(nodes);