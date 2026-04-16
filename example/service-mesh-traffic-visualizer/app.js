const canvas = document.getElementById('mesh');
const ctx = canvas.getContext('2d');
const services = [
  { id: 'gateway', x: 120, y: 280, label: 'api-gateway', health: 1.0 },
  { id: 'auth', x: 320, y: 140, label: 'auth-svc', health: 1.0 },
  { id: 'users', x: 320, y: 420, label: 'users-svc', health: 1.0 },
  { id: 'orders', x: 540, y: 200, label: 'orders-svc', health: 1.0 },
  { id: 'inventory', x: 540, y: 380, label: 'inventory', health: 1.0 },
  { id: 'payments', x: 760, y: 280, label: 'payments', health: 1.0 },
];
const edges = [
  ['gateway','auth'], ['gateway','users'], ['auth','users'],
  ['users','orders'], ['users','inventory'], ['orders','payments'],
  ['inventory','payments'], ['orders','inventory']
];
let packets = [];
let paused = false;
let selected = null;
let totals = { req: 0, err: 0, p50: 0 };
let rate = 8;

document.getElementById('toggle').onclick = (e) => {
  paused = !paused; e.target.textContent = paused ? 'Resume' : 'Pause';
};
document.getElementById('chaos').onclick = () => {
  const s = services[Math.floor(Math.random() * services.length)];
  s.health = 0.2;
  setTimeout(() => s.health = 1.0, 5000);
};
document.getElementById('rate').oninput = (e) => rate = +e.target.value;

canvas.onclick = (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * canvas.width / rect.width;
  const my = (e.clientY - rect.top) * canvas.height / rect.height;
  selected = services.find(s => Math.hypot(s.x - mx, s.y - my) < 35) || null;
  renderDetail();
};

function spawnPacket() {
  const [a, b] = edges[Math.floor(Math.random() * edges.length)];
  const from = services.find(s => s.id === a);
  const to = services.find(s => s.id === b);
  const err = Math.random() > to.health;
  packets.push({ from, to, t: 0, err, latency: 20 + Math.random() * 80 });
  totals.req++;
  if (err) totals.err++;
  totals.p50 = Math.round(totals.p50 * 0.9 + (20 + Math.random() * 80) * 0.1);
}

function drawEdge(a, b) {
  ctx.strokeStyle = '#2a2f3d';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}

function drawNode(s) {
  const color = s.health < 0.5 ? '#f87171' : '#6ee7b7';
  ctx.fillStyle = '#1a1d27';
  ctx.strokeStyle = selected === s ? '#fbbf24' : color;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(s.x, s.y, 28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(s.label, s.x, s.y + 4);
  ctx.fillStyle = '#9ca3af';
  ctx.font = '9px sans-serif';
  ctx.fillText('sidecar', s.x, s.y + 18);
}

function drawPacket(p) {
  const x = p.from.x + (p.to.x - p.from.x) * p.t;
  const y = p.from.y + (p.to.y - p.from.y) * p.t;
  ctx.fillStyle = p.err ? '#f87171' : '#6ee7b7';
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
}

function renderMetrics() {
  const list = document.getElementById('metrics');
  const errRate = totals.req ? (totals.err / totals.req * 100).toFixed(1) : '0.0';
  list.innerHTML = `
    <li><span>Requests</span><span>${totals.req}</span></li>
    <li><span>Errors</span><span>${totals.err}</span></li>
    <li><span>Error Rate</span><span>${errRate}%</span></li>
    <li><span>p50 latency</span><span>${totals.p50}ms</span></li>
    <li><span>Active packets</span><span>${packets.length}</span></li>
  `;
}

function renderDetail() {
  const d = document.getElementById('detail');
  if (!selected) { d.textContent = 'Click a node'; return; }
  d.innerHTML = `<strong style="color:#6ee7b7">${selected.label}</strong><br>
    Health: ${(selected.health * 100).toFixed(0)}%<br>
    Protocol: mTLS + HTTP/2<br>
    Sidecar: envoy v1.28<br>
    Retries: 3 · Timeout: 2s`;
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  edges.forEach(([a, b]) => drawEdge(services.find(s=>s.id===a), services.find(s=>s.id===b)));
  if (!paused) {
    if (Math.random() < rate / 20) spawnPacket();
    packets.forEach(p => p.t += 0.015);
    packets = packets.filter(p => p.t < 1);
  }
  packets.forEach(drawPacket);
  services.forEach(drawNode);
  renderMetrics();
  requestAnimationFrame(loop);
}
renderDetail();
loop();