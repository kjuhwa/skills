const canvas = document.getElementById('ring');
const ctx = canvas.getContext('2d');
const info = document.getElementById('info');
const cx = 250, cy = 250, radius = 180;
const nodeColors = ['#6ee7b7','#f472b6','#60a5fa','#fbbf24','#a78bfa','#fb923c'];
let nodes = [], keys = [], nodeId = 0, keyId = 0;

function hash(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff; return (h >>> 0) / 0xffffffff; }

function addNode() { nodes.push({ id: 'N' + nodeId, pos: hash('node' + nodeId + Date.now()), color: nodeColors[nodeId % nodeColors.length] }); nodeId++; draw(); }
function removeNode() { if (nodes.length > 1) { nodes.splice(Math.floor(Math.random() * nodes.length), 1); draw(); } }
function addKey() { keys.push({ id: 'K' + keyId, pos: hash('key' + keyId + Date.now()) }); keyId++; draw(); }

function findNode(pos) {
  if (!nodes.length) return null;
  const sorted = [...nodes].sort((a, b) => a.pos - b.pos);
  for (const n of sorted) if (n.pos >= pos) return n;
  return sorted[0];
}

function draw() {
  ctx.clearRect(0, 0, 500, 500);
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.strokeStyle = '#2a2d37'; ctx.lineWidth = 3; ctx.stroke();
  const assignments = {};
  keys.forEach(k => {
    const n = findNode(k.pos);
    if (!n) return;
    const a = k.pos * Math.PI * 2 - Math.PI / 2;
    const kx = cx + Math.cos(a) * radius, ky = cy + Math.sin(a) * radius;
    const na = n.pos * Math.PI * 2 - Math.PI / 2;
    const nx = cx + Math.cos(na) * radius, ny = cy + Math.sin(na) * radius;
    ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(nx, ny); ctx.strokeStyle = n.color + '44'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(kx, ky, 5, 0, Math.PI * 2); ctx.fillStyle = n.color + '99'; ctx.fill();
    ctx.fillStyle = '#e2e8f0'; ctx.font = '10px sans-serif'; ctx.fillText(k.id, kx + 8, ky + 3);
    assignments[n.id] = (assignments[n.id] || 0) + 1;
  });
  nodes.forEach(n => {
    const a = n.pos * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * radius, y = cy + Math.sin(a) * radius;
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fillStyle = n.color; ctx.fill();
    ctx.fillStyle = '#0f1117'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n.id, x, y + 3); ctx.textAlign = 'start';
  });
  info.textContent = nodes.map(n => `${n.id}: ${assignments[n.id] || 0} keys`).join(' | ');
}

document.getElementById('addNode').onclick = addNode;
document.getElementById('removeNode').onclick = removeNode;
document.getElementById('addKey').onclick = addKey;
for (let i = 0; i < 3; i++) addNode();
for (let i = 0; i < 12; i++) addKey();