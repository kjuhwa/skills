const canvas = document.getElementById('ring');
const ctx = canvas.getContext('2d');
const infoEl = document.getElementById('info');
const CX = 210, CY = 210, R = 160, RING = 360;
const COLORS = ['#6ee7b7','#f9a8d4','#93c5fd','#fcd34d','#c4b5fd','#fb923c','#67e8f9'];

let nodes = [], keys = [], nodeId = 0, keyId = 0;

function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) & 0x7fffffff;
  return h % RING;
}

function findNode(angle) {
  if (!nodes.length) return null;
  const sorted = [...nodes].sort((a, b) => a.angle - b.angle);
  for (const n of sorted) if (n.angle >= angle) return n;
  return sorted[0];
}

function addNode(name) {
  const a = hash(name || `node-${nodeId}`);
  nodes.push({ id: nodeId++, name: name || `node-${nodeId - 1}`, angle: a, color: COLORS[nodes.length % COLORS.length] });
  draw();
}

function addKey() {
  const name = `key-${keyId++}`;
  keys.push({ name, angle: hash(name) });
  draw();
}

function toXY(angle, r) {
  const rad = (angle - 90) * Math.PI / 180;
  return [CX + Math.cos(rad) * r, CY + Math.sin(rad) * r];
}

function draw() {
  ctx.clearRect(0, 0, 420, 420);
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.strokeStyle = '#6ee7b733'; ctx.lineWidth = 2; ctx.stroke();

  for (let d = 0; d < 360; d += 30) {
    const [x, y] = toXY(d, R + 12);
    ctx.fillStyle = '#94a3b844'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(d + '°', x, y + 3);
  }

  keys.forEach(k => {
    const owner = findNode(k.angle);
    const [kx, ky] = toXY(k.angle, R);
    if (owner) {
      const [nx, ny] = toXY(owner.angle, R);
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(nx, ny);
      ctx.strokeStyle = owner.color + '44'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(kx, ky, 4, 0, Math.PI * 2);
    ctx.fillStyle = owner ? owner.color : '#94a3b8'; ctx.fill();
  });

  nodes.forEach(n => {
    const [x, y] = toXY(n.angle, R);
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = n.color; ctx.fill();
    ctx.fillStyle = '#0f1117'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(n.id, x, y + 3);
  });

  const mapping = {};
  nodes.forEach(n => mapping[n.id] = []);
  keys.forEach(k => { const o = findNode(k.angle); if (o) mapping[o.id].push(k.name); });

  infoEl.innerHTML = `<h3>Ring State</h3>` +
    nodes.map(n => `<div class="node-entry"><b style="color:${n.color}">${n.name}</b> @ ${n.angle}° — ${(mapping[n.id]||[]).length} keys` +
      (mapping[n.id]||[]).map(k => `<div class="key-entry">${k}</div>`).join('') + `</div>`).join('') +
    (keys.length ? `<div style="margin-top:8px;color:#94a3b8">${keys.length} keys, ${nodes.length} nodes</div>` : '');
}

document.getElementById('btnNode').onclick = () => addNode();
document.getElementById('btnKey').onclick = addKey;
document.getElementById('btnRemove').onclick = () => { if (nodes.length) { nodes.pop(); nodeId = nodes.length; draw(); } };
document.getElementById('btnReset').onclick = () => { nodes = []; keys = []; nodeId = 0; keyId = 0; draw(); };

['alpha','beta','gamma'].forEach(addNode);
for (let i = 0; i < 8; i++) addKey();