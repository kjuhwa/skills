const canvas = document.getElementById('timeline');
const ctx = canvas.getContext('2d');
const feed = document.getElementById('feed');
const statsEl = document.getElementById('stats');
const buckets = Array.from({ length: 60 }, () => ({ error: 0, warn: 0, info: 0, debug: 0 }));
const counts = { error: 0, warn: 0, info: 0, debug: 0 };
const levels = ['error', 'warn', 'info', 'debug'];
const colors = { error: '#f7768e', warn: '#e0af68', info: '#9ece6a', debug: '#565f89' };
const services = ['api-gw', 'auth-svc', 'payments', 'users', 'scheduler', 'cache'];
const messages = {
  error: ['Connection refused', 'Timeout exceeded', 'OOM killed', 'Null pointer'],
  warn: ['Slow query 1200ms', 'Retry attempt 3/5', 'Disk usage 89%', 'Pool exhausted'],
  info: ['Request handled 200', 'User login OK', 'Job completed', 'Cache hit'],
  debug: ['Parsing payload', 'SQL: SELECT *', 'Token refreshed', 'GC pause 12ms']
};

function resize() {
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
}
resize();
window.addEventListener('resize', resize);

function draw() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  const bw = w / 60;
  buckets.forEach((b, i) => {
    let y = h;
    for (const l of levels) {
      const bh = Math.min(b[l] * 4, h / 4);
      ctx.fillStyle = colors[l];
      ctx.globalAlpha = 0.8;
      ctx.fillRect(i * bw + 1, y - bh, bw - 2, bh);
      y -= bh;
    }
  });
  ctx.globalAlpha = 1;
}

function addLog() {
  const level = levels[Math.random() < 0.05 ? 0 : Math.random() < 0.15 ? 1 : Math.random() < 0.7 ? 2 : 3];
  const svc = services[Math.floor(Math.random() * services.length)];
  const msg = messages[level][Math.floor(Math.random() * messages[level].length)];
  const ts = new Date().toISOString().slice(11, 23);
  counts[level]++;
  buckets[buckets.length - 1][level]++;
  const el = document.createElement('div');
  el.className = `log-line ${level}`;
  el.innerHTML = `<span class="ts">${ts}</span> <span class="src">[${svc}]</span> ${level.toUpperCase()} ${msg}`;
  feed.prepend(el);
  if (feed.children.length > 200) feed.lastChild.remove();
  statsEl.innerHTML = levels.map(l => `${l}: <span>${counts[l]}</span>`).join(' &middot; ');
}

setInterval(() => { buckets.shift(); buckets.push({ error: 0, warn: 0, info: 0, debug: 0 }); }, 1000);
setInterval(draw, 100);
setInterval(addLog, 150);
for (let i = 0; i < 30; i++) addLog();