const replicas = [
  { id: 'primary', name: 'db-primary', region: 'us-east-1', role: 'PRIMARY', lag: 0, down: false },
  { id: 'r1', name: 'replica-01', region: 'us-east-1', role: 'REPLICA', lag: 0.2, down: false },
  { id: 'r2', name: 'replica-02', region: 'us-west-2', role: 'REPLICA', lag: 0.8, down: false },
  { id: 'r3', name: 'replica-03', region: 'eu-west-1', role: 'REPLICA', lag: 1.4, down: false },
  { id: 'r4', name: 'replica-04', region: 'ap-south-1', role: 'REPLICA', lag: 2.1, down: false }
];
const colors = ['#6ee7b7', '#60a5fa', '#c084fc', '#fbbf24', '#f472b6'];
const history = replicas.map(() => Array(60).fill(0));

function renderCards() {
  const root = document.getElementById('replicaCards');
  root.innerHTML = '';
  replicas.forEach((r, i) => {
    const lagLevel = r.lag > 5 ? 'crit' : r.lag > 2 ? 'warn' : '';
    const div = document.createElement('div');
    div.className = 'card' + (r.role === 'PRIMARY' ? ' primary' : '') + (r.down ? ' down' : '');
    div.innerHTML = `
      <h3>${r.role} · ${r.region}</h3>
      <div class="name">${r.name}</div>
      <div class="lag ${lagLevel}">${r.down ? 'DOWN' : r.lag.toFixed(2) + 's'}</div>
      <div class="meta">Color: <i style="background:${colors[i]};display:inline-block;width:10px;height:10px;border-radius:50%"></i></div>
    `;
    root.appendChild(div);
  });
}

function renderLegend() {
  const lg = document.getElementById('legend');
  lg.innerHTML = replicas.map((r, i) =>
    `<span><i style="background:${colors[i]}"></i>${r.name}</span>`
  ).join('');
}

function drawChart() {
  const c = document.getElementById('lagChart');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = '#2a2f3d';
  ctx.lineWidth = 1;
  for (let y = 0; y <= 4; y++) {
    const py = (H - 20) * y / 4 + 10;
    ctx.beginPath();
    ctx.moveTo(40, py); ctx.lineTo(W - 10, py); ctx.stroke();
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px monospace';
    ctx.fillText((4 - y) * 2.5 + 's', 6, py + 3);
  }
  replicas.forEach((r, i) => {
    if (r.role === 'PRIMARY') return;
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 2;
    ctx.beginPath();
    history[i].forEach((v, x) => {
      const px = 40 + (W - 50) * x / 59;
      const py = H - 10 - Math.min(v, 10) / 10 * (H - 20);
      if (x === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
  });
}

function updateStatus() {
  const maxLag = Math.max(...replicas.filter(r => !r.down && r.role !== 'PRIMARY').map(r => r.lag));
  const anyDown = replicas.some(r => r.down);
  const dot = document.querySelector('.dot');
  const text = document.getElementById('clusterStatus');
  if (anyDown || maxLag > 5) {
    dot.className = 'dot crit';
    text.textContent = anyDown ? 'Replica Down' : 'Critical Lag';
  } else if (maxLag > 2) {
    dot.className = 'dot warn';
    text.textContent = 'Degraded';
  } else {
    dot.className = 'dot';
    text.textContent = 'Cluster Healthy';
  }
}

function tick() {
  replicas.forEach((r, i) => {
    if (r.down) { r.lag = 0; return; }
    if (r.role === 'PRIMARY') return;
    const drift = (Math.random() - 0.5) * 0.4;
    r.lag = Math.max(0.05, r.lag + drift * 0.3);
    history[i].shift();
    history[i].push(r.lag);
  });
  renderCards();
  drawChart();
  updateStatus();
}

document.getElementById('spikeBtn').onclick = () => {
  const target = replicas.filter(r => !r.down && r.role !== 'PRIMARY');
  const pick = target[Math.floor(Math.random() * target.length)];
  if (pick) pick.lag += 4 + Math.random() * 3;
};
document.getElementById('failBtn').onclick = () => {
  const up = replicas.filter(r => !r.down && r.role !== 'PRIMARY');
  if (up.length) up[Math.floor(Math.random() * up.length)].down = true;
};
document.getElementById('healBtn').onclick = () => {
  replicas.forEach(r => { r.down = false; r.lag = 0.3 + Math.random() * 0.5; });
};

renderLegend();
tick();
setInterval(tick, 1000);