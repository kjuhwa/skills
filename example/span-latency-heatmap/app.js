const services = ['api-gateway', 'auth-svc', 'order-svc', 'payment-svc', 'inventory-svc'];
const canvas = document.getElementById('heat');
const ctx = canvas.getContext('2d');
const svcSel = document.getElementById('svc');
const winSel = document.getElementById('win');

svcSel.innerHTML = services.map(s => `<option>${s}</option>`).join('');

const COLS = 60;
const ROWS = 24;
const latencyBuckets = [];
for (let i = 0; i < ROWS; i++) {
  latencyBuckets.push(10 * Math.pow(1000 / 10, i / (ROWS - 1)));
}

function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', () => { resize(); draw(); });

function generateGrid(service) {
  const grid = Array.from({ length: COLS }, () => new Array(ROWS).fill(0));
  const svcIdx = services.indexOf(service);
  const baseMean = 30 + svcIdx * 25;
  for (let c = 0; c < COLS; c++) {
    const spikes = (c > COLS * 0.7 && Math.random() < 0.3) ? 1.5 : 1;
    const requests = Math.floor(50 + Math.random() * 80);
    for (let i = 0; i < requests; i++) {
      const latency = Math.max(5, baseMean * spikes * (0.3 + Math.random() * 2.5) + (Math.random() < 0.05 ? 400 : 0));
      const row = latencyBuckets.findIndex(b => latency < b);
      if (row >= 0) grid[c][row]++;
    }
  }
  return grid;
}

function draw() {
  const grid = generateGrid(svcSel.value);
  const w = canvas.width, h = canvas.height;
  const cw = w / COLS, ch = h / ROWS;
  let max = 0;
  grid.forEach(col => col.forEach(v => { if (v > max) max = v; }));
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(0, 0, w, h);
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const v = grid[c][r];
      if (v === 0) continue;
      const intensity = v / max;
      const row = ROWS - 1 - r;
      const hue = 150 - intensity * 150;
      const lum = 20 + intensity * 45;
      ctx.fillStyle = `hsl(${hue}, 70%, ${lum}%)`;
      ctx.fillRect(c * cw, row * ch, cw - 0.5, ch - 0.5);
    }
  }

  const allLatencies = [];
  grid.forEach(col => col.forEach((count, r) => {
    for (let i = 0; i < count; i++) allLatencies.push(latencyBuckets[r]);
  }));
  allLatencies.sort((a, b) => a - b);
  const pct = p => allLatencies[Math.floor(allLatencies.length * p)] || 0;
  const p50 = pct(0.5), p90 = pct(0.9), p99 = pct(0.99), pMax = allLatencies[allLatencies.length - 1] || 0;

  document.getElementById('summary').textContent = `${allLatencies.length} spans · p99 ${p99.toFixed(0)}ms`;

  const maxShown = 1000;
  document.getElementById('pct').innerHTML = `
    <h3>Percentiles</h3>
    ${[['p50', p50], ['p90', p90], ['p99', p99], ['max', pMax]].map(([l, v]) => {
      const cls = v > 500 ? 'err' : v > 200 ? 'warn' : '';
      return `<div class="pct-row">
        <span class="pct-label">${l}</span>
        <span class="pct-val ${cls}">${v.toFixed(1)}ms</span>
      </div>
      <div class="bar"><div class="bar-fill" style="width:${Math.min(100, v / maxShown * 100)}%;background:${cls === 'err' ? '#f87171' : cls === 'warn' ? '#f59e0b' : '#6ee7b7'}"></div></div>`;
    }).join('')}
    <div class="pct-row" style="margin-top:14px"><span class="pct-label">samples</span><span class="pct-val">${allLatencies.length}</span></div>`;
}

function renderXAxis() {
  const ax = document.getElementById('xaxis');
  const win = parseInt(winSel.value);
  const steps = 6;
  ax.innerHTML = '';
  for (let i = steps; i >= 0; i--) {
    const s = Math.round(win * i / steps);
    const span = document.createElement('span');
    span.textContent = `-${s}s`;
    ax.appendChild(span);
  }
}

svcSel.addEventListener('change', draw);
winSel.addEventListener('change', () => { renderXAxis(); draw(); });

resize();
renderXAxis();
draw();
setInterval(draw, 3000);