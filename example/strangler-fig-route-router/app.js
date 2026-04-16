let routes = [
  { path: '/api/users', split: 30 },
  { path: '/api/orders', split: 60 },
  { path: '/api/catalog', split: 90 },
  { path: '/api/auth', split: 10 }
];
const canvas = document.getElementById('traffic');
const ctx = canvas.getContext('2d');
const chart = document.getElementById('chart');
const cctx = chart.getContext('2d');
const particles = [];
let totalLegacy = 0, totalNew = 0, errors = 0;
const history = Array.from({ length: 60 }, () => ({ l: 0, n: 0 }));

function renderRoutes() {
  const container = document.getElementById('routeList');
  container.innerHTML = '';
  routes.forEach((r, i) => {
    const div = document.createElement('div');
    div.className = 'route';
    div.innerHTML = `
      <div class="route-head"><code>${r.path}</code><button data-i="${i}">×</button></div>
      <div class="slider-wrap">
        <input type="range" min="0" max="100" value="${r.split}" data-idx="${i}">
        <div class="slider-labels"><span class="l">Legacy ${100 - r.split}%</span><span class="n">New ${r.split}%</span></div>
      </div>`;
    container.appendChild(div);
  });
  container.querySelectorAll('input[type=range]').forEach(inp => {
    inp.oninput = e => {
      routes[+e.target.dataset.idx].split = +e.target.value;
      renderRoutes();
    };
  });
  container.querySelectorAll('button').forEach(b => {
    b.onclick = () => { routes.splice(+b.dataset.i, 1); renderRoutes(); };
  });
}

document.getElementById('addRoute').onclick = () => {
  const name = '/api/svc-' + Math.floor(Math.random() * 900 + 100);
  routes.push({ path: name, split: 50 });
  renderRoutes();
};

function spawn() {
  if (!routes.length) return;
  const r = routes[Math.floor(Math.random() * routes.length)];
  const toNew = Math.random() * 100 < r.split;
  particles.push({
    x: 0, y: 180 + (Math.random() - 0.5) * 40,
    vx: 2 + Math.random() * 1.5,
    target: toNew ? 'new' : 'legacy',
    route: r.path,
    life: 0,
    err: Math.random() < 0.03
  });
}

function drawArrow(x1, y1, x2, y2, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function drawTraffic() {
  ctx.fillStyle = '#13161f'; ctx.fillRect(0, 0, 520, 360);
  // Proxy box
  ctx.strokeStyle = '#6ee7b7'; ctx.lineWidth = 2;
  ctx.strokeRect(220, 150, 80, 60);
  ctx.fillStyle = '#6ee7b7'; ctx.font = 'bold 12px sans-serif';
  ctx.fillText('Strangler', 232, 180); ctx.fillText('Proxy', 240, 198);
  // Legacy
  ctx.strokeStyle = '#f87171'; ctx.strokeRect(420, 60, 80, 60);
  ctx.fillStyle = '#f87171'; ctx.fillText('Legacy', 437, 95);
  // New
  ctx.strokeStyle = '#6ee7b7'; ctx.strokeRect(420, 240, 80, 60);
  ctx.fillStyle = '#6ee7b7'; ctx.fillText('New', 445, 275);
  // Client
  ctx.strokeStyle = '#9ca3af'; ctx.strokeRect(20, 150, 80, 60);
  ctx.fillStyle = '#9ca3af'; ctx.fillText('Client', 42, 185);

  drawArrow(100, 180, 220, 180, '#6b7280');
  drawArrow(300, 170, 420, 90, '#f87171');
  drawArrow(300, 190, 420, 270, '#6ee7b7');

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life++;
    if (p.life < 30) {
      p.x = 100 + (p.life / 30) * 120; p.y = 180;
    } else if (p.life < 70) {
      const t = (p.life - 30) / 40;
      p.x = 220 + t * 200;
      p.y = p.target === 'legacy' ? 180 - t * 90 : 180 + t * 90;
    } else {
      particles.splice(i, 1);
      if (p.err) errors++;
      else if (p.target === 'legacy') totalLegacy++;
      else totalNew++;
      continue;
    }
    ctx.fillStyle = p.err ? '#ef4444' : (p.target === 'legacy' ? '#f87171' : '#6ee7b7');
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
  }

  document.getElementById('total').textContent = totalLegacy + totalNew + errors;
  document.getElementById('totalLegacy').textContent = totalLegacy;
  document.getElementById('totalNew').textContent = totalNew;
  document.getElementById('errors').textContent = errors;
}

function drawChart() {
  cctx.fillStyle = '#13161f'; cctx.fillRect(0, 0, 520, 180);
  const maxV = Math.max(10, ...history.map(h => h.l + h.n));
  const w = 520 / history.length;
  history.forEach((h, i) => {
    const lh = (h.l / maxV) * 160;
    const nh = (h.n / maxV) * 160;
    cctx.fillStyle = '#f87171';
    cctx.fillRect(i * w, 180 - lh, w - 1, lh);
    cctx.fillStyle = '#6ee7b7';
    cctx.fillRect(i * w, 180 - lh - nh, w - 1, nh);
  });
  cctx.strokeStyle = '#1f2430'; cctx.lineWidth = 1;
  for (let y = 0; y < 180; y += 40) { cctx.beginPath(); cctx.moveTo(0, y); cctx.lineTo(520, y); cctx.stroke(); }
}

let tick = 0, lastL = 0, lastN = 0;
function loop() {
  if (Math.random() < 0.6) spawn();
  if (Math.random() < 0.3) spawn();
  drawTraffic();
  tick++;
  if (tick % 30 === 0) {
    history.push({ l: totalLegacy - lastL, n: totalNew - lastN });
    history.shift();
    lastL = totalLegacy; lastN = totalNew;
    drawChart();
  }
  requestAnimationFrame(loop);
}

renderRoutes();
drawChart();
loop();