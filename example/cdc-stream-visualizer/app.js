const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const counterEl = document.getElementById('counter');
let W, H, running = true, eventCount = 0;
const particles = [];
const tables = ['users','orders','products','payments','sessions'];
const ops = ['INSERT','UPDATE','DELETE'];
const opColors = { INSERT: '#6ee7b7', UPDATE: '#60a5fa', DELETE: '#f87171' };

function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
resize(); addEventListener('resize', resize);

function spawn() {
  const op = ops[Math.random() * 3 | 0];
  const table = tables[Math.random() * 5 | 0];
  particles.push({ x: -10, y: 60 + Math.random() * (H - 80), vx: 1.2 + Math.random() * 2, size: 4 + Math.random() * 4, op, table, alpha: 1, id: ++eventCount });
  counterEl.textContent = eventCount + ' events';
}

function draw() {
  ctx.fillStyle = '#0f1117'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#1a1d2744'; ctx.lineWidth = 1;
  for (let y = 60; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (running) { p.x += p.vx; p.y += Math.sin(p.x * 0.01 + p.id) * 0.3; }
    if (p.x > W + 20) { particles.splice(i, 1); continue; }
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = opColors[p.op];
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.15;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size + 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (running && Math.random() < 0.3) spawn();
  requestAnimationFrame(draw);
}

canvas.addEventListener('mousemove', e => {
  const hit = particles.find(p => Math.hypot(p.x - e.clientX, p.y - e.clientY) < p.size + 4);
  if (hit) { tooltip.style.display = 'block'; tooltip.style.left = e.clientX + 12 + 'px'; tooltip.style.top = e.clientY - 10 + 'px'; tooltip.textContent = `${hit.op} on ${hit.table}\nEvent #${hit.id}`; }
  else tooltip.style.display = 'none';
});

function toggleStream() {
  running = !running;
  document.getElementById('toggleBtn').textContent = running ? '⏸ Pause' : '▶ Resume';
}
draw();