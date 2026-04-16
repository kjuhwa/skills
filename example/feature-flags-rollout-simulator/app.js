const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d');
const pct = document.getElementById('pct');
const pctLabel = document.getElementById('pctLabel');
const strategy = document.getElementById('strategy');
const shuffle = document.getElementById('shuffle');
const onCount = document.getElementById('onCount');
const offCount = document.getElementById('offCount');
const variance = document.getElementById('variance');

const COLS = 32, ROWS = 21;
const regions = ['us', 'eu', 'asia', 'sa'];
let users = [];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

function makeUsers() {
  users = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    users.push({
      id: 'u_' + Math.random().toString(36).slice(2, 10),
      region: regions[Math.floor(Math.random() * regions.length)],
      jitter: Math.random()
    });
  }
}

function isEnabled(user, p) {
  const s = strategy.value;
  if (s === 'random') return user.jitter < p;
  if (s === 'hash') return hash(user.id) < p;
  if (s === 'region') {
    const boost = { us: 0.3, eu: 0.2, asia: 0.0, sa: -0.1 }[user.region];
    return hash(user.id + user.region) < (p + boost);
  }
}

function render() {
  const p = +pct.value / 100;
  pctLabel.textContent = pct.value;
  const w = canvas.width / COLS;
  const h = canvas.height / ROWS;
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let on = 0;
  users.forEach((u, i) => {
    const x = (i % COLS) * w + 2;
    const y = Math.floor(i / COLS) * h + 2;
    const enabled = isEnabled(u, p);
    if (enabled) on++;
    ctx.fillStyle = enabled ? '#6ee7b7' : '#374151';
    ctx.beginPath();
    ctx.arc(x + w / 2 - 1, y + h / 2 - 1, Math.min(w, h) / 2.8, 0, Math.PI * 2);
    ctx.fill();
  });
  const off = users.length - on;
  onCount.textContent = on;
  offCount.textContent = off;
  const expected = users.length * p;
  variance.textContent = ((on - expected) / users.length * 100).toFixed(2) + '%';
}

pct.addEventListener('input', render);
strategy.addEventListener('change', render);
shuffle.addEventListener('click', () => { makeUsers(); render(); });

makeUsers();
render();