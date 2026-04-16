const subscriptions = [
  { name: 'onMessageCreated', topic: 'chat', enabled: true, samples: ['"Hello team!"', '"Deploying to prod"', '"PR merged"'] },
  { name: 'onUserOnline', topic: 'presence', enabled: true, samples: ['user:alice', 'user:bob', 'user:carol'] },
  { name: 'onOrderUpdate', topic: 'commerce', enabled: true, samples: ['#1024 shipped', '#1025 placed', '#1026 refunded'] },
  { name: 'onMetricTick', topic: 'metrics', enabled: false, samples: ['cpu=42%', 'mem=68%', 'rps=1280'] }
];

let paused = false;
let total = 0;
const history = new Array(60).fill(0);
const eventsEl = document.getElementById('events');
const subsEl = document.getElementById('subs');
const countEl = document.getElementById('count');
const canvas = document.getElementById('graph');
const ctx = canvas.getContext('2d');

function renderSubs() {
  subsEl.innerHTML = '';
  subscriptions.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'sub' + (s.enabled ? '' : ' off');
    div.innerHTML = `<div class="sub-name">${s.name}</div><div class="sub-meta">topic: ${s.topic} · ${s.enabled ? 'LIVE' : 'PAUSED'}</div>`;
    div.onclick = () => { s.enabled = !s.enabled; renderSubs(); };
    subsEl.appendChild(div);
  });
}

function emit() {
  if (paused) return;
  const active = subscriptions.filter(s => s.enabled);
  if (!active.length) return;
  const burst = Math.random() < 0.3 ? 3 : 1;
  for (let i = 0; i < burst; i++) {
    const sub = active[Math.floor(Math.random() * active.length)];
    const sample = sub.samples[Math.floor(Math.random() * sub.samples.length)];
    const t = new Date().toLocaleTimeString();
    const ev = document.createElement('div');
    ev.className = 'event';
    ev.innerHTML = `<span class="event-time">${t}</span><span class="event-type">${sub.name}</span><span class="event-data">${sample}</span>`;
    eventsEl.prepend(ev);
    while (eventsEl.children.length > 50) eventsEl.lastChild.remove();
    total++;
    history[history.length - 1]++;
  }
  countEl.textContent = total;
}

function tick() {
  history.shift();
  history.push(0);
  drawChart();
}

function drawChart() {
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#2a2f3d';
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  const max = Math.max(10, ...history);
  const step = w / (history.length - 1);
  ctx.fillStyle = 'rgba(110, 231, 183, 0.15)';
  ctx.beginPath();
  ctx.moveTo(0, h);
  history.forEach((v, i) => ctx.lineTo(i * step, h - (v / max) * (h - 16)));
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  history.forEach((v, i) => {
    const x = i * step, y = h - (v / max) * (h - 16);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px monospace';
  ctx.fillText(`peak: ${max}/s`, 8, 14);
}

document.getElementById('pause').onclick = e => {
  paused = !paused;
  e.target.textContent = paused ? '▶ Resume' : '⏸ Pause';
};
document.getElementById('clear').onclick = () => { eventsEl.innerHTML = ''; total = 0; countEl.textContent = 0; };

renderSubs();
setInterval(emit, 350);
setInterval(tick, 1000);
drawChart();