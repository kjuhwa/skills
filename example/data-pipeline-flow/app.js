const cvs = document.getElementById('stage');
const ctx = cvs.getContext('2d');
const stats = document.getElementById('stats');
const playBtn = document.getElementById('playBtn');
const burstBtn = document.getElementById('burstBtn');
const rateInput = document.getElementById('rate');

let W, H;
function resize() {
  W = cvs.width = cvs.clientWidth;
  H = cvs.height = cvs.clientHeight;
}
window.addEventListener('resize', resize);

const stages = [
  { id: 'src', name: 'Source', x: 0.08, processed: 0, dropRate: 0 },
  { id: 'val', name: 'Validate', x: 0.28, processed: 0, dropRate: 0.05 },
  { id: 'trn', name: 'Transform', x: 0.50, processed: 0, dropRate: 0.02 },
  { id: 'agg', name: 'Aggregate', x: 0.72, processed: 0, dropRate: 0 },
  { id: 'sink', name: 'Sink', x: 0.92, processed: 0, dropRate: 0 },
];

const packets = [];
let running = true;
let total = 0, dropped = 0, spawnAccum = 0;

function spawn(n = 1) {
  for (let i = 0; i < n; i++) {
    packets.push({
      stage: 0,
      t: 0,
      y: 0.3 + Math.random() * 0.4,
      hue: 140 + Math.random() * 40,
      size: 3 + Math.random() * 3,
    });
    total++;
  }
}

function step(dt) {
  spawnAccum += dt * parseFloat(rateInput.value);
  while (spawnAccum > 1) { spawn(1); spawnAccum -= 1; }

  for (let i = packets.length - 1; i >= 0; i--) {
    const p = packets[i];
    p.t += dt * 0.6;
    if (p.t >= 1) {
      p.t = 0;
      const next = stages[p.stage + 1];
      if (!next) { packets.splice(i, 1); stages[p.stage].processed++; continue; }
      if (Math.random() < next.dropRate) {
        packets.splice(i, 1); dropped++; continue;
      }
      stages[p.stage].processed++;
      p.stage++;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  ctx.strokeStyle = '#262a36';
  ctx.lineWidth = 2;
  for (let i = 0; i < stages.length - 1; i++) {
    ctx.beginPath();
    ctx.moveTo(stages[i].x * W, H / 2);
    ctx.lineTo(stages[i + 1].x * W, H / 2);
    ctx.stroke();
  }

  stages.forEach((s, i) => {
    const x = s.x * W, y = H / 2;
    ctx.fillStyle = '#1a1d27';
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#6ee7b7';
    ctx.font = '12px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText(s.name, x, y + 48);
    ctx.fillStyle = '#8a90a2';
    ctx.fillText(s.processed, x, y + 4);
  });

  packets.forEach(p => {
    const a = stages[p.stage], b = stages[p.stage + 1];
    if (!b) return;
    const x = (a.x + (b.x - a.x) * p.t) * W;
    const baseY = H / 2;
    const wave = Math.sin(p.t * Math.PI) * (p.y - 0.5) * 60;
    const y = baseY + wave;
    ctx.fillStyle = `hsl(${p.hue}, 70%, 65%)`;
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderStats() {
  const rows = stages.map(s => `<div class="stage-row"><span>${s.name}</span><span>${s.processed}</span></div>`).join('');
  stats.innerHTML = `
    <div class="stat"><div class="label">Ingested</div><div class="value">${total}</div></div>
    <div class="stat"><div class="label">Dropped</div><div class="value">${dropped}</div></div>
    <div class="stat"><div class="label">In Flight</div><div class="value">${packets.length}</div></div>
    ${rows}
  `;
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (running) step(dt);
  draw();
  requestAnimationFrame(loop);
}

playBtn.onclick = () => { running = !running; playBtn.textContent = running ? 'Pause' : 'Play'; };
burstBtn.onclick = () => spawn(40);

resize();
renderStats();
setInterval(renderStats, 500);
requestAnimationFrame(loop);