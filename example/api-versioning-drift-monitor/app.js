const VER = ['v1','v2','v3','v4'];
const COLORS = ['#f87171','#fbbf24','#60a5fa','#6ee7b7'];
const clients = [
  { name:'mobile-ios', ver:'v4' }, { name:'mobile-android', ver:'v3' },
  { name:'web-app', ver:'v4' }, { name:'partner-a', ver:'v2' },
  { name:'partner-b', ver:'v4' }, { name:'legacy-batch', ver:'v1' },
  { name:'dashboard', ver:'v4' }, { name:'cli-tool', ver:'v3' }
];
let counts = { v1:0, v2:0, v3:0, v4:0 }, total = 0, logEl, canvas, ctx;

function init() {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth * 2; canvas.height = 440;
  logEl = document.getElementById('log');
  setInterval(tick, 900);
  renderStats();
}

function tick() {
  const c = clients[Math.floor(Math.random() * clients.length)];
  counts[c.ver]++; total++;
  addLog(c);
  drawChart();
  renderStats();
}

function drawChart() {
  const W = canvas.width, H = canvas.height, pad = 60;
  ctx.clearRect(0, 0, W, H);
  const max = Math.max(...VER.map(v => counts[v]), 1);
  const bw = (W - pad * 2) / VER.length - 20;
  VER.forEach((v, i) => {
    const h = (counts[v] / max) * (H - pad * 2);
    const x = pad + i * (bw + 20);
    const y = H - pad - h;
    ctx.fillStyle = COLORS[i];
    ctx.beginPath();
    ctx.roundRect(x, y, bw, h, [6, 6, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#94a3b8'; ctx.font = '22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(v, x + bw / 2, H - 18);
    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 24px sans-serif';
    ctx.fillText(counts[v], x + bw / 2, y - 10);
  });
}

function renderStats() {
  const latest = counts.v4, outdated = counts.v1 + counts.v2;
  const pct = total ? Math.round(latest / total * 100) : 0;
  const driftClass = pct > 70 ? 'drift-ok' : pct > 40 ? 'drift-warn' : 'drift-bad';
  document.getElementById('stats').innerHTML = `<h3>Drift Summary</h3>
    <div class="stat-row"><span class="stat-label">Total Requests</span><span class="stat-val">${total}</span></div>
    <div class="stat-row"><span class="stat-label">Latest (v4)</span><span class="stat-val ${driftClass}">${pct}%</span></div>
    <div class="stat-row"><span class="stat-label">Outdated (v1+v2)</span><span class="stat-val drift-warn">${outdated}</span></div>
    <div class="stat-row"><span class="stat-label">Unique Clients</span><span class="stat-val">${clients.length}</span></div>
    <div class="stat-row"><span class="stat-label">Health</span><span class="stat-val ${driftClass}">${pct > 70 ? '● Healthy' : pct > 40 ? '● Warning' : '● Critical'}</span></div>`;
}

function addLog(c) {
  const el = document.createElement('div');
  el.className = 'log-line';
  const t = new Date().toLocaleTimeString();
  el.innerHTML = `<span class="ver-tag ${c.ver}">${c.ver}</span>${t} — ${c.name} → GET /users`;
  logEl.prepend(el);
  if (logEl.children.length > 40) logEl.lastChild.remove();
}
window.addEventListener('load', init);