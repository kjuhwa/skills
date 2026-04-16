const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const state = { queue: [], produced: 0, consumed: 0, dropped: 0, paused: false, t: 0 };
const COLORS = ['#6ee7b7', '#fbbf24', '#f87171', '#60a5fa', '#c084fc'];

function rand(n) { return Math.floor(Math.random() * n); }

function produce() {
  const cap = +document.getElementById('cap').value;
  if (state.queue.length >= cap) { state.dropped++; return; }
  state.queue.push({
    id: ++state.produced,
    color: COLORS[rand(COLORS.length)],
    x: 0,
    target: 0
  });
}

function consume() {
  if (state.queue.length === 0) return;
  const m = state.queue[0];
  if (m.x < m.target - 5) return;
  state.queue.shift();
  state.consumed++;
}

function tick() {
  state.t++;
  if (!state.paused) {
    const pr = +document.getElementById('prate').value;
    const cr = +document.getElementById('crate').value;
    if (Math.random() * 100 < pr / 3) produce();
    if (Math.random() * 100 < cr / 3) consume();
  }
  draw();
  document.getElementById('produced').textContent = state.produced;
  document.getElementById('consumed').textContent = state.consumed;
  document.getElementById('inqueue').textContent = state.queue.length;
  document.getElementById('dropped').textContent = state.dropped;
  requestAnimationFrame(tick);
}

function draw() {
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(0, 0, W, H);
  const beltY = H / 2;
  ctx.strokeStyle = '#1a1d27';
  ctx.lineWidth = 60;
  ctx.beginPath();
  ctx.moveTo(60, beltY);
  ctx.lineTo(W - 60, beltY);
  ctx.stroke();
  for (let i = 0; i < W; i += 20) {
    const off = (state.t * 2 + i) % 40;
    ctx.fillStyle = '#252836';
    ctx.fillRect(60 + off, beltY - 28, 4, 56);
  }
  ctx.fillStyle = '#6ee7b7';
  ctx.fillRect(20, beltY - 40, 40, 80);
  ctx.fillStyle = '#0f1117';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('PROD', 24, beltY + 4);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(W - 60, beltY - 40, 40, 80);
  ctx.fillStyle = '#0f1117';
  ctx.fillText('CONS', W - 56, beltY + 4);
  const slotW = (W - 160) / Math.max(state.queue.length, 1);
  state.queue.forEach((m, i) => {
    m.target = 80 + i * 30;
    m.x += (m.target - m.x) * 0.15;
    ctx.fillStyle = m.color;
    ctx.fillRect(m.x - 12, beltY - 12, 24, 24);
    ctx.fillStyle = '#0f1117';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(m.id, m.x - 6, beltY + 3);
  });
}

document.getElementById('burst').onclick = () => { for (let i = 0; i < 10; i++) produce(); };
document.getElementById('pause').onclick = (e) => { state.paused = !state.paused; e.target.textContent = state.paused ? 'Resume' : 'Pause'; };

for (let i = 0; i < 5; i++) produce();
tick();