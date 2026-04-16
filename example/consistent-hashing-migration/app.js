const svg = document.getElementById('viz');
const info = document.getElementById('info');
const W = 600, H = 400, CX = 200, CY = 200, RAD = 150;
const MAXH = 1000;
const nColors = ['#6ee7b7','#f472b6','#60a5fa','#fbbf24','#a78bfa','#fb923c','#34d399','#f87171'];
let nodes = [], keyData = [], nid = 0;

function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h % MAXH; }
function axy(v) { const a = (v / MAXH) * Math.PI * 2 - Math.PI / 2; return [CX + RAD * Math.cos(a), CY + RAD * Math.sin(a)]; }

function owner(h) {
  if (!nodes.length) return null;
  const s = [...nodes].sort((a, b) => a.h - b.h);
  for (const n of s) if (n.h >= h) return n;
  return s[0];
}

function initKeys() { keyData = ['users','orders','products','sessions','cache','images','logs','config','tokens','metrics','events','tasks'].map(k => ({ name: k, h: hash(k) })); }

function render(moved) {
  let s = `<circle cx="${CX}" cy="${CY}" r="${RAD}" fill="none" stroke="#333" stroke-width="1.5"/>`;
  const assignments = keyData.map(k => ({ ...k, owner: owner(k.h) }));
  assignments.forEach(k => {
    const [kx, ky] = axy(k.h);
    const o = k.owner;
    if (o) { const [nx, ny] = axy(o.h); s += `<line x1="${kx}" y1="${ky}" x2="${nx}" y2="${ny}" stroke="${o.color}33" stroke-width="1"/>`; }
    const isMoved = moved && moved.has(k.name);
    s += `<circle cx="${kx}" cy="${ky}" r="${isMoved ? 6 : 4}" fill="${o ? o.color : '#555'}" opacity="${isMoved ? 1 : 0.7}"><animate attributeName="r" from="8" to="${isMoved ? 6 : 4}" dur="0.4s"/></circle>`;
    s += `<text x="${kx}" y="${ky - 8}" fill="#999" font-size="9" text-anchor="middle">${k.name}</text>`;
  });
  nodes.forEach(n => {
    const [x, y] = axy(n.h);
    s += `<circle cx="${x}" cy="${y}" r="12" fill="${n.color}" opacity="0.9"/>`;
    s += `<text x="${x}" y="${y + 4}" fill="#000" font-size="10" font-weight="bold" text-anchor="middle">${n.name}</text>`;
  });
  const legendX = 430;
  nodes.forEach((n, i) => {
    const count = assignments.filter(a => a.owner && a.owner.id === n.id).length;
    s += `<rect x="${legendX}" y="${30 + i * 26}" width="14" height="14" rx="3" fill="${n.color}"/>`;
    s += `<text x="${legendX + 20}" y="${42 + i * 26}" fill="#ccc" font-size="11">${n.name}: ${count} keys</text>`;
  });
  svg.innerHTML = s;
}

function addNode() {
  const before = keyData.map(k => ({ name: k.name, owner: owner(k.h)?.id }));
  const n = { id: nid++, name: 'S' + nid, h: hash('server-' + nid), color: nColors[nodes.length % nColors.length] };
  nodes.push(n);
  const moved = new Set();
  keyData.forEach((k, i) => { const now = owner(k.h); if (before[i].owner !== undefined && before[i].owner !== now?.id) moved.add(k.name); });
  render(moved);
  info.innerHTML = `Added <b>${n.name}</b>. Keys migrated: <span class="moved">${moved.size}</span> / ${keyData.length}`;
}

function rmNode() {
  if (!nodes.length) return;
  const before = keyData.map(k => ({ name: k.name, owner: owner(k.h)?.id }));
  const removed = nodes.pop();
  const moved = new Set();
  keyData.forEach((k, i) => { const now = owner(k.h); if (before[i].owner !== now?.id) moved.add(k.name); });
  render(moved);
  info.innerHTML = `Removed <b>${removed.name}</b>. Keys migrated: <span class="moved">${moved.size}</span> / ${keyData.length}`;
}

document.getElementById('addBtn').onclick = addNode;
document.getElementById('rmBtn').onclick = rmNode;
document.getElementById('resetBtn').onclick = () => { nodes = []; nid = 0; initKeys(); render(); info.innerHTML = 'Reset. Add nodes to begin.'; };

initKeys();
addNode(); addNode(); addNode();