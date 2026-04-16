const services = [
  { name: 'auth-api', req: 0, retry: 0, failRate: 0.05 },
  { name: 'payment-svc', req: 0, retry: 0, failRate: 0.18 },
  { name: 'inventory', req: 0, retry: 0, failRate: 0.08 },
  { name: 'notifications', req: 0, retry: 0, failRate: 0.25 },
  { name: 'search-idx', req: 0, retry: 0, failRate: 0.03 }
];
const THRESHOLD = 0.10;
let totalReq = 0, totalRetry = 0, blocked = 0;
const history = [];
let paused = false;

function tick() {
  if (paused) return;
  services.forEach(s => {
    const requests = 3 + Math.floor(Math.random() * 8);
    s.req += requests;
    totalReq += requests;
    for (let i = 0; i < requests; i++) {
      if (Math.random() < s.failRate) {
        const ratio = s.req > 0 ? s.retry / s.req : 0;
        if (ratio < THRESHOLD) {
          s.retry++;
          totalRetry++;
        } else {
          blocked++;
        }
      }
    }
  });
  const globalRatio = totalReq > 0 ? totalRetry / totalReq : 0;
  history.push(globalRatio);
  if (history.length > 120) history.shift();
  render(globalRatio);
}

function render(ratio) {
  const pct = (ratio * 100).toFixed(1);
  const el = document.getElementById('ratio');
  el.textContent = pct + '%';
  el.classList.toggle('over', ratio > THRESHOLD);
  const bar = document.getElementById('ratioBar');
  bar.style.width = Math.min(100, ratio * 100 * 5) + '%';
  bar.classList.toggle('over', ratio > THRESHOLD);
  document.getElementById('totalReq').textContent = totalReq;
  document.getElementById('totalRetry').textContent = totalRetry;
  document.getElementById('blocked').textContent = blocked;

  const container = document.getElementById('services');
  container.innerHTML = '';
  services.forEach(s => {
    const r = s.req > 0 ? s.retry / s.req : 0;
    const cls = r >= THRESHOLD ? 'throttled' : r >= THRESHOLD * 0.7 ? 'warn' : '';
    const state = r >= THRESHOLD ? 'THROTTLED' : r >= THRESHOLD * 0.7 ? 'WARN' : 'HEALTHY';
    const div = document.createElement('div');
    div.className = 'service ' + cls;
    div.innerHTML = `
      <div class="svc-name">${s.name}</div>
      <div class="svc-stat">${s.retry}/${s.req} (${(r*100).toFixed(1)}%)</div>
      <div class="svc-badge ${cls}">${state}</div>`;
    container.appendChild(div);
  });
  drawTimeline();
}

function drawTimeline() {
  const c = document.getElementById('timeline');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#f87171';
  ctx.setLineDash([4, 4]);
  const thY = H - (THRESHOLD * 5 * H);
  ctx.beginPath(); ctx.moveTo(0, thY); ctx.lineTo(W, thY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#f87171'; ctx.font = '10px monospace';
  ctx.fillText(`threshold ${(THRESHOLD*100)}%`, 8, thY - 4);
  if (history.length < 2) return;
  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  history.forEach((v, i) => {
    const x = (i / (history.length - 1)) * W;
    const y = H - Math.min(H, v * 5 * H);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

document.getElementById('toggle').onclick = (e) => {
  paused = !paused;
  e.target.textContent = paused ? 'Resume' : 'Pause';
};

setInterval(tick, 600);
tick();