const clients = [
  { key: 'free-tier-42', name: 'Free Tier', limit: 60 },
  { key: 'pro-user-A17', name: 'Pro', limit: 300 },
  { key: 'ent-corp-X92', name: 'Enterprise', limit: 1500 },
  { key: 'bot-scraper-7', name: 'Scraper Bot', limit: 60 },
  { key: 'internal-svc-3', name: 'Internal', limit: 5000 },
  { key: 'free-tier-99', name: 'Free Tier', limit: 60 },
];
const endpoints = ['/users', '/orders', '/search', '/auth/login', '/metrics', '/products'];

const state = clients.map(c => ({ ...c, used: Math.floor(Math.random() * c.limit * 0.4) }));
const spark = new Array(60).fill(0).map(() => ({ ok: 0, ko: 0 }));
const feed = [];

const cvs = document.getElementById('spark');
const ctx = cvs.getContext('2d');

function tick() {
  // age spark
  spark.push({ ok: 0, ko: 0 });
  spark.shift();

  // new requests
  const count = 3 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const c = state[Math.floor(Math.random() * state.length)];
    const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
    const bucket = spark[spark.length - 1];
    if (c.used < c.limit) {
      c.used++;
      bucket.ok++;
      feed.unshift({ code: 200, key: c.key, ep, t: new Date() });
    } else {
      bucket.ko++;
      feed.unshift({ code: 429, key: c.key, ep, t: new Date() });
    }
  }
  // refill trickle
  for (const c of state) c.used = Math.max(0, c.used - Math.random() * c.limit * 0.015);

  while (feed.length > 40) feed.pop();
  render();
}

function render() {
  // cards
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  for (const c of state) {
    const pct = Math.min(100, (c.used / c.limit) * 100);
    const cls = pct > 90 ? 'crit' : pct > 70 ? 'warn' : '';
    const card = document.createElement('div');
    card.className = 'card ' + cls;
    card.innerHTML = `
      <h3>${c.name}</h3>
      <div class="key">${c.key}</div>
      <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
      <div class="stats-row"><span><b>${Math.floor(c.used)}</b> / ${c.limit}</span><span>${pct.toFixed(0)}%</span></div>
    `;
    grid.appendChild(card);
  }

  // sparkline
  const W = cvs.width, H = cvs.height;
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(0, 0, W, H);
  const max = Math.max(10, ...spark.map(b => b.ok + b.ko));
  const bw = W / spark.length;
  for (let i = 0; i < spark.length; i++) {
    const b = spark[i];
    const total = b.ok + b.ko;
    const h = (total / max) * (H - 20);
    const okH = (b.ok / Math.max(1, total)) * h;
    ctx.fillStyle = '#6ee7b7';
    ctx.fillRect(i * bw + 1, H - okH, bw - 2, okH);
    ctx.fillStyle = '#f87171';
    ctx.fillRect(i * bw + 1, H - h, bw - 2, h - okH);
  }
  ctx.fillStyle = '#9ca3af';
  ctx.font = '10px monospace';
  ctx.fillText('-60s', 4, 12);
  ctx.fillText('now', W - 28, 12);

  // feed
  const ul = document.getElementById('feed');
  ul.innerHTML = feed.map(f => `
    <li>
      <span class="t">${f.t.toLocaleTimeString()}</span>
      <span class="code c${f.code}">${f.code}</span>
      <span class="p">${f.ep}</span>
      <span class="k">${f.key}</span>
    </li>`).join('');

  document.getElementById('clock').textContent = new Date().toLocaleTimeString();
}

render();
setInterval(tick, 900);