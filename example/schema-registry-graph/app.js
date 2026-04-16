const schemas = [
  { id: 'User', fields: [{ n: 'id', t: 'string' }, { n: 'email', t: 'string' }, { n: 'address', t: 'Address' }], version: 3, compat: 'BACKWARD' },
  { id: 'Address', fields: [{ n: 'street', t: 'string' }, { n: 'city', t: 'string' }, { n: 'geo', t: 'GeoPoint' }], version: 2, compat: 'FULL' },
  { id: 'GeoPoint', fields: [{ n: 'lat', t: 'double' }, { n: 'lng', t: 'double' }], version: 1, compat: 'FULL' },
  { id: 'Order', fields: [{ n: 'orderId', t: 'string' }, { n: 'user', t: 'User' }, { n: 'items', t: 'LineItem[]' }, { n: 'payment', t: 'Payment' }], version: 5, compat: 'BACKWARD' },
  { id: 'LineItem', fields: [{ n: 'sku', t: 'string' }, { n: 'qty', t: 'int' }, { n: 'product', t: 'Product' }], version: 2, compat: 'BACKWARD' },
  { id: 'Product', fields: [{ n: 'sku', t: 'string' }, { n: 'name', t: 'string' }, { n: 'price', t: 'Money' }], version: 4, compat: 'FULL' },
  { id: 'Money', fields: [{ n: 'amount', t: 'double' }, { n: 'currency', t: 'string' }], version: 1, compat: 'FULL' },
  { id: 'Payment', fields: [{ n: 'method', t: 'string' }, { n: 'total', t: 'Money' }], version: 3, compat: 'BACKWARD' },
  { id: 'Shipment', fields: [{ n: 'trackingId', t: 'string' }, { n: 'dest', t: 'Address' }, { n: 'order', t: 'Order' }], version: 2, compat: 'BACKWARD' }
];

const knownIds = new Set(schemas.map(s => s.id));
const edges = [];
schemas.forEach(s => s.fields.forEach(f => {
  const t = f.t.replace('[]', '');
  if (knownIds.has(t)) edges.push({ from: s.id, to: t });
}));

document.getElementById('nodeCount').textContent = schemas.length;
document.getElementById('edgeCount').textContent = edges.length;

const canvas = document.getElementById('graph');
const ctx = canvas.getContext('2d');
let W, H;
function resize() { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; }
window.addEventListener('resize', resize);
resize();

const nodes = schemas.map((s, i) => ({
  ...s,
  x: W / 2 + Math.cos(i / schemas.length * Math.PI * 2) * 200 + (Math.random() - .5) * 50,
  y: H / 2 + Math.sin(i / schemas.length * Math.PI * 2) * 200 + (Math.random() - .5) * 50,
  vx: 0, vy: 0
}));

const nodeMap = new Map(nodes.map(n => [n.id, n]));
let selected = null, dragging = null, dragOffset = { x: 0, y: 0 };

function step() {
  // spring-repel forces
  for (let a of nodes) {
    for (let b of nodes) {
      if (a === b) continue;
      const dx = a.x - b.x, dy = a.y - b.y;
      const d = Math.max(Math.sqrt(dx*dx + dy*dy), 1);
      const f = 3000 / (d * d);
      a.vx += dx / d * f;
      a.vy += dy / d * f;
    }
  }
  for (let e of edges) {
    const a = nodeMap.get(e.from), b = nodeMap.get(e.to);
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.max(Math.sqrt(dx*dx + dy*dy), 1);
    const f = (d - 150) * 0.02;
    a.vx += dx / d * f; a.vy += dy / d * f;
    b.vx -= dx / d * f; b.vy -= dy / d * f;
  }
  for (let n of nodes) {
    if (n === dragging) continue;
    n.vx *= 0.85; n.vy *= 0.85;
    n.x += n.vx; n.y += n.vy;
    n.x = Math.max(50, Math.min(W - 50, n.x));
    n.y = Math.max(50, Math.min(H - 50, n.y));
  }
}

function draw() {
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(0, 0, W, H);
  // edges
  ctx.strokeStyle = '#2a2e3a';
  ctx.lineWidth = 1.5;
  edges.forEach(e => {
    const a = nodeMap.get(e.from), b = nodeMap.get(e.to);
    const isSel = selected && (a === selected || b === selected);
    ctx.strokeStyle = isSel ? '#6ee7b7' : '#2a2e3a';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    // arrow
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const ax = b.x - Math.cos(ang) * 26, ay = b.y - Math.sin(ang) * 26;
    ctx.fillStyle = isSel ? '#6ee7b7' : '#4a4e5a';
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - Math.cos(ang - 0.4) * 8, ay - Math.sin(ang - 0.4) * 8);
    ctx.lineTo(ax - Math.cos(ang + 0.4) * 8, ay - Math.sin(ang + 0.4) * 8);
    ctx.fill();
  });
  // nodes
  nodes.forEach(n => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, 22, 0, Math.PI * 2);
    ctx.fillStyle = n === selected ? '#6ee7b7' : '#1a1d27';
    ctx.fill();
    ctx.strokeStyle = n === selected ? '#6ee7b7' : '#6ee7b7';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = n === selected ? '#0f1117' : '#e4e6eb';
    ctx.font = '11px -apple-system';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.id, n.x, n.y);
    ctx.fillStyle = '#8a8f9b';
    ctx.font = '9px monospace';
    ctx.fillText('v' + n.version, n.x, n.y + 34);
  });
}

function loop() { step(); draw(); requestAnimationFrame(loop); }
loop();

function pick(x, y) {
  return nodes.find(n => (n.x - x) ** 2 + (n.y - y) ** 2 < 484);
}

canvas.addEventListener('mousedown', e => {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const n = pick(x, y);
  if (n) { dragging = n; dragOffset = { x: n.x - x, y: n.y - y }; selected = n; showPanel(n); }
});
canvas.addEventListener('mousemove', e => {
  if (!dragging) return;
  const r = canvas.getBoundingClientRect();
  dragging.x = e.clientX - r.left + dragOffset.x;
  dragging.y = e.clientY - r.top + dragOffset.y;
  dragging.vx = dragging.vy = 0;
});
canvas.addEventListener('mouseup', () => dragging = null);

function showPanel(n) {
  document.getElementById('panelTitle').textContent = n.id;
  const refs = edges.filter(e => e.from === n.id).map(e => e.to);
  const refBy = edges.filter(e => e.to === n.id).map(e => e.from);
  document.getElementById('panelBody').innerHTML =
    n.fields.map(f => {
      const bare = f.t.replace('[]', '');
      const isRef = knownIds.has(bare);
      return `<div class="field"><span>${f.n}</span><span class="${isRef ? 'fref' : 'ftype'}">${f.t}</span></div>`;
    }).join('') +
    `<div class="meta">
      <b>Version:</b> ${n.version}<br>
      <b>Compatibility:</b> ${n.compat}<br>
      <b>References:</b> ${refs.join(', ') || '—'}<br>
      <b>Referenced by:</b> ${refBy.join(', ') || '—'}
    </div>`;
}

selected = nodes[0];
showPanel(selected);