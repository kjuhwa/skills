const users = ['ada', 'linus', 'grace', 'alan', 'margaret', 'dennis', 'claude', 'barbara'];
const actions = ['click', 'view', 'share', 'like'];
const scores = Object.fromEntries(users.map(u => [u, 0]));
const hourly = Array(7).fill(0).map(() => Array(24).fill(0));
let events = [];
let rate = 3;
let paused = false;
let lastLag = 0;

const rateInput = document.getElementById('rate');
const rateLabel = document.getElementById('rate-label');
const lagEl = document.getElementById('lag');
const pauseBtn = document.getElementById('pause');
const tickerEl = document.querySelector('.ticker');
const lbEl = document.querySelector('.lb');
const gridEl = document.querySelector('.grid');
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

for (let i = 0; i < 7 * 24; i++) {
  const c = document.createElement('div');
  c.className = 'cell';
  gridEl.appendChild(c);
}

rateInput.oninput = () => { rate = +rateInput.value; rateLabel.textContent = rate; };
pauseBtn.onclick = () => { paused = !paused; pauseBtn.textContent = paused ? '▶ Resume' : '⏸ Pause'; };

function emit() {
  if (paused) return;
  const e = {
    user: users[Math.floor(Math.random() * users.length)],
    action: actions[Math.floor(Math.random() * actions.length)],
    weight: Math.floor(Math.random() * 10) + 1,
    t: Date.now()
  };
  events.push(e);
  lastLag = Math.floor(Math.random() * 40) + 20;
  lagEl.textContent = lastLag + 'ms';
}

setInterval(() => { for (let i = 0; i < rate; i++) emit(); }, 1000);

function tickerProjection() {
  const now = Date.now();
  events.filter(e => !e.t_ticker && now - e.t > 60).forEach(e => {
    e.t_ticker = 1;
    const li = document.createElement('li');
    li.textContent = `[${new Date(e.t).toLocaleTimeString()}] ${e.user} ${e.action} +${e.weight}`;
    tickerEl.prepend(li);
    while (tickerEl.children.length > 18) tickerEl.lastChild.remove();
  });
}

function leaderboardProjection() {
  const now = Date.now();
  events.filter(e => !e.t_lb && now - e.t > 120).forEach(e => {
    e.t_lb = 1;
    scores[e.user] += e.weight;
  });
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 6);
  lbEl.innerHTML = sorted.map(([u, s]) => `<li><span>${u}</span><strong style="color:#6ee7b7">${s}</strong></li>`).join('');

  const max = Math.max(1, ...sorted.map(s => s[1]));
  ctx.clearRect(0, 0, 300, 260);
  sorted.forEach(([u, s], i) => {
    const w = (s / max) * 220;
    ctx.fillStyle = '#6ee7b7';
    ctx.fillRect(70, i * 38 + 10, w, 24);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px monospace';
    ctx.fillText(u, 10, i * 38 + 26);
  });
}

function rollupProjection() {
  const now = Date.now();
  events.filter(e => !e.t_ro && now - e.t > 400).forEach(e => {
    e.t_ro = 1;
    const d = new Date(e.t);
    hourly[d.getDay() % 7][d.getHours()] += e.weight;
  });
  const flat = hourly.flat();
  const max = Math.max(1, ...flat);
  [...gridEl.children].forEach((c, i) => {
    const v = flat[i];
    c.style.background = `rgba(110,231,183,${v / max})`;
    c.textContent = v || '';
  });
}

function loop() {
  tickerProjection();
  leaderboardProjection();
  rollupProjection();
  if (events.length > 2000) events = events.slice(-1500);
  requestAnimationFrame(loop);
}
loop();

for (let i = 0; i < 40; i++) {
  const t = Date.now() - Math.random() * 3600000;
  events.push({
    user: users[Math.floor(Math.random() * users.length)],
    action: actions[Math.floor(Math.random() * actions.length)],
    weight: Math.floor(Math.random() * 10) + 1,
    t, t_ticker: 1, t_lb: 1, t_ro: 1
  });
  const d = new Date(t);
  const e = events[events.length - 1];
  scores[e.user] += e.weight;
  hourly[d.getDay() % 7][d.getHours()] += e.weight;
}