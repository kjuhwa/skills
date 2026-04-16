const state = {
  blue:  { lat: 120, err: 0.5, cpu: 42, pods: '4/4', history: [], chaos: 0 },
  green: { lat: 95,  err: 0.2, cpu: 38, pods: '4/4', history: [], chaos: 0 },
  live: 'blue'
};

const bCtx = document.getElementById('bChart').getContext('2d');
const gCtx = document.getElementById('gChart').getContext('2d');

function tick() {
  ['blue','green'].forEach(k => {
    const s = state[k];
    const base = k === 'blue' ? 120 : 95;
    const chaosBump = s.chaos > 0 ? (200 + Math.random() * 400) : 0;
    s.lat = Math.max(40, base + (Math.random() - 0.5) * 30 + chaosBump);
    s.err = Math.max(0, (k === 'blue' ? 0.5 : 0.2) + (Math.random() - 0.45) + (s.chaos ? Math.random() * 8 : 0));
    s.cpu = Math.max(10, Math.min(99, s.cpu + (Math.random() - 0.5) * 8 + (s.chaos ? 15 : 0)));
    s.history.push(s.lat);
    if (s.history.length > 60) s.history.shift();
    if (s.chaos > 0) s.chaos--;
  });
  paint();
}

function drawChart(ctx, data, color) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0f1117'; ctx.fillRect(0, 0, W, H);
  if (!data.length) return;
  const max = Math.max(...data, 200);
  ctx.strokeStyle = '#252a38';
  ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();

  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / 59) * W;
    const y = H - (v / max) * H;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = color + '22';
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
}

function paint() {
  const b = state.blue, g = state.green;
  document.getElementById('bLat').textContent = Math.round(b.lat) + 'ms';
  document.getElementById('gLat').textContent = Math.round(g.lat) + 'ms';
  document.getElementById('bErr').textContent = b.err.toFixed(2) + '%';
  document.getElementById('gErr').textContent = g.err.toFixed(2) + '%';
  document.getElementById('bCpu').textContent = Math.round(b.cpu) + '%';
  document.getElementById('gCpu').textContent = Math.round(g.cpu) + '%';

  const cls = (s) => s.err > 5 || s.lat > 400 ? 'fail' : (s.err > 2 || s.lat > 200 ? 'degraded' : 'ok');
  const txt = (c) => c === 'ok' ? '● HEALTHY' : (c === 'degraded' ? '▲ DEGRADED' : '✖ UNHEALTHY');
  const bc = cls(b), gc = cls(g);
  const bEl = document.getElementById('bCheck'); bEl.className = 'check ' + bc; bEl.textContent = txt(bc);
  const gEl = document.getElementById('gCheck'); gEl.className = 'check ' + gc; gEl.textContent = txt(gc);

  drawChart(bCtx, b.history, '#60a5fa');
  drawChart(gCtx, g.history, '#6ee7b7');

  const liveEnv = state[state.live];
  const idleEnv = state[state.live === 'blue' ? 'green' : 'blue'];
  const liveCls = cls(liveEnv), idleCls = cls(idleEnv);
  let verdict = `LIVE=${state.live.toUpperCase()} status=${liveCls}`;
  if (liveCls !== 'ok' && idleCls === 'ok') verdict += '  → RECOMMENDATION: cutover to idle environment';
  else if (liveCls === 'ok') verdict += '  → system stable, safe to deploy new build to idle';
  else verdict += '  → both environments impaired, halt deploys';
  document.getElementById('verdict').textContent = verdict;

  const m = document.getElementById('mode');
  m.textContent = state.live.toUpperCase() + ' LIVE';
  m.style.background = state.live === 'blue' ? '#60a5fa' : '#6ee7b7';
}

document.getElementById('chaos').addEventListener('click', () => {
  const tgt = Math.random() < 0.5 ? 'blue' : 'green';
  state[tgt].chaos = 8;
  state[tgt].pods = '2/4';
  setTimeout(() => state[tgt].pods = '4/4', 8000);
});

document.getElementById('cutover').addEventListener('click', () => {
  state.live = state.live === 'blue' ? 'green' : 'blue';
  paint();
});

setInterval(tick, 500);
tick();