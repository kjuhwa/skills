const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');
const MAX = 20, HISTORY = 80;
let pool = { active: 3, idle: 7, waiting: 0 };
let demand = 5, paused = false;
let history = { active: [], idle: [], waiting: [] };
for (let i = 0; i < HISTORY; i++) { history.active.push(3); history.idle.push(7); history.waiting.push(0); }

function addLoad() { demand = Math.min(demand + 3, 30); }
function releaseLoad() { demand = Math.max(demand - 3, 0); }
function togglePause() { paused = !paused; }

function tick() {
  if (paused) return;
  const target = Math.min(demand + Math.floor(Math.random() * 4 - 2), 30);
  pool.active += Math.sign(target - pool.active) * Math.ceil(Math.random() * 2);
  pool.active = Math.max(0, Math.min(MAX, pool.active));
  pool.idle = MAX - pool.active;
  pool.waiting = Math.max(0, target - MAX);
  document.getElementById('active').textContent = pool.active;
  document.getElementById('idle').textContent = pool.idle;
  document.getElementById('waiting').textContent = pool.waiting;
  document.getElementById('total').textContent = MAX;
  history.active.push(pool.active); history.idle.push(pool.idle); history.waiting.push(pool.waiting);
  if (history.active.length > HISTORY) { history.active.shift(); history.idle.shift(); history.waiting.shift(); }
  draw();
}

function draw() {
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const drawLine = (data, color) => {
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
    data.forEach((v, i) => { const x = (i / (HISTORY - 1)) * w, y = h - (v / 30) * h; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.stroke();
  };
  drawLine(history.active, '#6ee7b7');
  drawLine(history.idle, '#3b82f6');
  drawLine(history.waiting, '#f87171');
  ctx.fillStyle = '#94a3b8'; ctx.font = '11px system-ui';
  ctx.fillText('■ Active', 10, 16); ctx.fillStyle = '#3b82f6'; ctx.fillText('■ Idle', 80, 16);
  ctx.fillStyle = '#f87171'; ctx.fillText('■ Waiting', 130, 16);
}

setInterval(tick, 400);