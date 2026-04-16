const canvas = document.getElementById('river');
const ctx = canvas.getContext('2d');
const rateEl = document.getElementById('rate');
const pauseBtn = document.getElementById('pause');
const filterEl = document.getElementById('filter');
const statsEl = document.getElementById('stats');
const feedEl = document.getElementById('feed');

const LEVELS = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
const COLORS = { ERROR: '#ff6b6b', WARN: '#ffd866', INFO: '#78dce8', DEBUG: '#8a8f9b' };
const SERVICES = ['api-gw', 'auth-svc', 'billing', 'db-proxy', 'notifier', 'worker'];
const MESSAGES = {
  ERROR: ['Connection refused', 'Timeout exceeded', 'Null pointer', 'DB deadlock', '500 upstream'],
  WARN: ['Slow query 2.4s', 'Retry attempt 3', 'Disk 85%', 'Cache miss spike', 'Deprecated call'],
  INFO: ['Request handled', 'User logged in', 'Task completed', 'Config reloaded', 'Heartbeat OK'],
  DEBUG: ['Trace start', 'Var dump', 'State snapshot', 'Probe ping', 'Hook fired']
};

let particles = [];
let counts = { ERROR: 0, WARN: 0, INFO: 0, DEBUG: 0 };
let paused = false;
let filter = 'all';

function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resize);
resize();

function rand(a) { return a[Math.floor(Math.random() * a.length)]; }

function emit() {
  const weights = ['DEBUG','DEBUG','INFO','INFO','INFO','INFO','WARN','WARN','ERROR'];
  const level = rand(weights);
  const svc = rand(SERVICES);
  const msg = rand(MESSAGES[level]);
  counts[level]++;
  const entry = {
    x: -20,
    y: Math.random() * canvas.height,
    vx: 2 + Math.random() * 3,
    vy: (Math.random() - 0.5) * 0.5,
    level, svc, msg,
    life: 1,
    size: level === 'ERROR' ? 7 : level === 'WARN' ? 5 : 3
  };
  particles.push(entry);
  if (filter === 'all' || filter === level) {
    const li = document.createElement('li');
    li.className = `lvl-${level}`;
    const t = new Date().toTimeString().slice(0,8);
    li.textContent = `${t} [${level}] ${svc}: ${msg}`;
    feedEl.prepend(li);
    while (feedEl.children.length > 40) feedEl.lastChild.remove();
  }
}

function updateStats() {
  const total = Object.values(counts).reduce((a,b)=>a+b,0);
  statsEl.innerHTML = LEVELS.map(l => {
    const pct = total ? ((counts[l]/total)*100).toFixed(1) : 0;
    return `<li><span style="color:${COLORS[l]}">${l}</span><span>${counts[l]} (${pct}%)</span></li>`;
  }).join('') + `<li><strong>Total</strong><strong>${total}</strong></li>`;
}

function tick() {
  if (!paused) {
    const rate = parseInt(rateEl.value);
    for (let i = 0; i < rate/5; i++) if (Math.random() < 0.8) emit();
  }
  ctx.fillStyle = 'rgba(15,17,23,0.2)';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (!paused) {
      p.x += p.vx;
      p.y += p.vy;
    }
    ctx.beginPath();
    ctx.fillStyle = COLORS[p.level];
    ctx.globalAlpha = 0.85;
    ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 30, p.y);
    ctx.strokeStyle = COLORS[p.level];
    ctx.lineWidth = p.size;
    ctx.stroke();
    if (p.x > canvas.width + 20) particles.splice(i, 1);
  }
  ctx.globalAlpha = 1;
  updateStats();
  requestAnimationFrame(tick);
}

pauseBtn.onclick = () => {
  paused = !paused;
  pauseBtn.textContent = paused ? 'Resume' : 'Pause';
};
filterEl.onchange = e => filter = e.target.value;

tick();