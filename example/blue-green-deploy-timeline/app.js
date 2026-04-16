const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const deploys = [];
const now = Date.now();
const versions = { blue: [1, 4, 0], green: [1, 4, 0] };
let activeEnv = 'blue';

for (let i = 30; i >= 0; i--) {
  const env = activeEnv === 'blue' ? 'green' : 'blue';
  versions[env][2]++;
  if (versions[env][2] > 9) { versions[env][2] = 0; versions[env][1]++; }
  const failed = Math.random() < 0.15;
  const duration = 30 + Math.floor(Math.random() * 180);
  const rolledBack = failed && Math.random() < 0.7;
  deploys.push({
    ts: now - i * 3600 * 1000 * 4,
    env,
    version: 'v' + versions[env].join('.'),
    duration,
    failed,
    rolledBack,
    errors: failed ? Math.floor(Math.random() * 50) + 5 : 0,
    author: ['alice', 'bob', 'carol', 'dan'][Math.floor(Math.random() * 4)]
  });
  if (!rolledBack) activeEnv = env;
}

const padding = 40;
const chartW = W - padding * 2;
const chartH = H - padding * 2;

function draw() {
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#262a36';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding + (chartH / 5) * i;
    ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(W - padding, y); ctx.stroke();
  }

  ctx.fillStyle = '#8b92a8';
  ctx.font = '11px monospace';
  ctx.fillText('300s', 4, padding + 4);
  ctx.fillText('0s', 4, H - padding + 4);

  const step = chartW / (deploys.length - 1);
  deploys.forEach((d, i) => {
    const x = padding + i * step;
    const y = padding + chartH - (d.duration / 300) * chartH;
    ctx.strokeStyle = '#262a36';
    ctx.beginPath(); ctx.moveTo(x, H - padding); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = d.rolledBack ? '#f87171' : d.env === 'blue' ? '#60a5fa' : '#6ee7b7';
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    if (d.failed && !d.rolledBack) {
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
    }
    d._x = x; d._y = y;
  });
}

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (W / rect.width);
  const my = (e.clientY - rect.top) * (H / rect.height);
  let best = null, bestDist = Infinity;
  deploys.forEach(d => {
    const dist = Math.hypot(d._x - mx, d._y - my);
    if (dist < 20 && dist < bestDist) { best = d; bestDist = dist; }
  });
  if (best) showDetails(best);
});

function showDetails(d) {
  const el = document.getElementById('details');
  el.innerHTML = `
    <h3>${d.version} → ${d.env.toUpperCase()}</h3>
    <div class="row"><span>Timestamp</span><span>${new Date(d.ts).toLocaleString()}</span></div>
    <div class="row"><span>Author</span><span>${d.author}</span></div>
    <div class="row"><span>Duration</span><span>${d.duration}s</span></div>
    <div class="row"><span>Status</span><span style="color:${d.rolledBack ? '#f87171' : d.failed ? '#fbbf24' : '#6ee7b7'}">${d.rolledBack ? 'ROLLED BACK' : d.failed ? 'DEGRADED' : 'SUCCESS'}</span></div>
    <div class="row"><span>Errors</span><span>${d.errors}</span></div>
  `;
}

function updateStats() {
  const total = deploys.length;
  const rollbacks = deploys.filter(d => d.rolledBack).length;
  const success = deploys.filter(d => !d.failed).length;
  const avg = Math.round(deploys.reduce((s, d) => s + d.duration, 0) / total);
  document.getElementById('totalDeploys').textContent = total;
  document.getElementById('successRate').textContent = Math.round(success / total * 100) + '%';
  document.getElementById('avgDuration').textContent = avg + 's';
  document.getElementById('rollbacks').textContent = rollbacks;
}

draw();
updateStats();
showDetails(deploys[deploys.length - 1]);