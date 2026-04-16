const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const tooltip = document.getElementById('tooltip');

function resize() { cv.width = window.innerWidth; cv.height = window.innerHeight - 50; }
window.addEventListener('resize', resize);
resize();

const nodes = [
  { id: 'gateway', x: 0.15, y: 0.5, r: 26 },
  { id: 'auth', x: 0.35, y: 0.25, r: 22 },
  { id: 'users', x: 0.35, y: 0.75, r: 22 },
  { id: 'orders', x: 0.55, y: 0.5, r: 24 },
  { id: 'payment', x: 0.75, y: 0.3, r: 22 },
  { id: 'inventory', x: 0.75, y: 0.7, r: 22 },
  { id: 'db', x: 0.9, y: 0.5, r: 20 },
];
const edges = [
  ['gateway', 'auth'], ['gateway', 'users'], ['gateway', 'orders'],
  ['orders', 'payment'], ['orders', 'inventory'],
  ['payment', 'db'], ['inventory', 'db'], ['users', 'db'], ['auth', 'db']
];

const metrics = Object.fromEntries(nodes.map(n => [n.id, { rps: 0, p99: 0, errorRate: 0 }]));
const particles = [];
let running = true;
let hover = null;

function nodePos(n) { return { x: n.x * cv.width, y: n.y * cv.height }; }

function nodeHealth(n) {
  const m = metrics[n.id];
  if (m.errorRate > 0.08) return '#f87171';
  if (m.p99 > 200) return '#f59e0b';
  return '#6ee7b7';
}

function spawnTraces() {
  if (!running) return;
  const spawnCount = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < spawnCount; i++) {
    const path = randomPath();
    const isError = Math.random() < 0.08;
    for (let j = 0; j < path.length - 1; j++) {
      particles.push({
        from: path[j], to: path[j + 1],
        progress: 0, speed: 0.008 + Math.random() * 0.01,
        delay: j * 20, error: isError && j === path.length - 2
      });
    }
    const endNode = path[path.length - 1];
    const m = metrics[endNode];
    m.rps = m.rps * 0.95 + 1;
    m.p99 = m.p99 * 0.9 + (50 + Math.random() * 250) * 0.1;
    m.errorRate = m.errorRate * 0.95 + (isError ? 0.05 : 0);
  }
}

function randomPath() {
  const path = ['gateway'];
  const mid = ['auth', 'users', 'orders'][Math.floor(Math.random() * 3)];
  path.push(mid);
  if (mid === 'orders') {
    path.push(Math.random() < 0.5 ? 'payment' : 'inventory');
  }
  path.push('db');
  return path;
}

function draw() {
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(0, 0, cv.width, cv.height);

  ctx.strokeStyle = '#2a2f3d';
  ctx.lineWidth = 1;
  edges.forEach(([a, b]) => {
    const na = nodes.find(n => n.id === a), nb = nodes.find(n => n.id === b);
    const pa = nodePos(na), pb = nodePos(nb);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  });

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (p.delay > 0) { p.delay--; continue; }
    p.progress += p.speed;
    const na = nodes.find(n => n.id === p.from), nb = nodes.find(n => n.id === p.to);
    const pa = nodePos(na), pb = nodePos(nb);
    const x = pa.x + (pb.x - pa.x) * p.progress;
    const y = pa.y + (pb.y - pa.y) * p.progress;
    ctx.fillStyle = p.error ? '#f87171' : '#6ee7b7';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    if (p.progress >= 1) particles.splice(i, 1);
  }

  nodes.forEach(n => {
    const p = nodePos(n);
    const color = nodeHealth(n);
    ctx.fillStyle = '#1a1d27';
    ctx.beginPath();
    ctx.arc(p.x, p.y, n.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = hover === n ? 3 : 2;
    ctx.stroke();
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(n.id, p.x, p.y + 4);
    const m = metrics[n.id];
    ctx.fillStyle = '#9ca3af';
    ctx.font = '9px monospace';
    ctx.fillText(`${m.rps.toFixed(0)} rps`, p.x, p.y + n.r + 12);
  });
}

cv.addEventListener('mousemove', e => {
  const rect = cv.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  hover = nodes.find(n => {
    const p = nodePos(n);
    return Math.hypot(p.x - mx, p.y - my) < n.r;
  });
  if (hover) {
    const m = metrics[hover.id];
    tooltip.style.display = 'block';
    tooltip.style.left = (e.clientX + 12) + 'px';
    tooltip.style.top = (e.clientY + 12) + 'px';
    tooltip.innerHTML = `<div class="name">${hover.id}</div>
      <div class="stat">rps: ${m.rps.toFixed(1)}</div>
      <div class="stat">p99: ${m.p99.toFixed(0)}ms</div>
      <div class="stat">error: ${(m.errorRate * 100).toFixed(2)}%</div>`;
  } else { tooltip.style.display = 'none'; }
});

document.getElementById('toggle').addEventListener('click', e => {
  running = !running;
  e.target.textContent = running ? 'Pause' : 'Resume';
});

setInterval(spawnTraces, 250);
function loop() { draw(); requestAnimationFrame(loop); }
loop();