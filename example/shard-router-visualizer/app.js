const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const logEl = document.getElementById('log');
const shardSlider = document.getElementById('shardSlider');
const shardCountEl = document.getElementById('shardCount');

let shardCount = 4;
let shards = [];
let recentKey = null;
let pulse = 0;

function hashKey(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

function initShards() {
  shards = Array.from({ length: shardCount }, (_, i) => ({
    id: i,
    keys: [],
    load: 0
  }));
}

function routeKey(key) {
  const hash = hashKey(key);
  const idx = hash % shardCount;
  shards[idx].keys.push(key);
  shards[idx].load = shards[idx].keys.length;
  recentKey = { key, idx, hash };
  pulse = 1;
  const div = document.createElement('div');
  div.innerHTML = `<span class="shard-tag">SHARD-${idx}</span> ← "${key}" (hash: ${hash})`;
  logEl.prepend(div);
  while (logEl.children.length > 50) logEl.lastChild.remove();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const w = canvas.width, h = canvas.height;
  const shardW = w / shardCount;
  const maxLoad = Math.max(1, ...shards.map(s => s.load));

  shards.forEach((s, i) => {
    const x = i * shardW + 20;
    const sw = shardW - 40;
    const fillHeight = (s.load / maxLoad) * (h - 160);
    ctx.fillStyle = '#22262f';
    ctx.fillRect(x, 120, sw, h - 160);
    const grad = ctx.createLinearGradient(0, 120, 0, h - 40);
    grad.addColorStop(0, '#6ee7b7');
    grad.addColorStop(1, '#3a8f6f');
    ctx.fillStyle = grad;
    ctx.fillRect(x, h - 40 - fillHeight, sw, fillHeight);
    if (recentKey && recentKey.idx === i && pulse > 0) {
      ctx.strokeStyle = `rgba(110, 231, 183, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2, 118, sw + 4, h - 158);
    }
    ctx.fillStyle = '#e4e6eb';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`SHARD-${i}`, x + sw / 2, 40);
    ctx.fillStyle = '#8a8f9c';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${s.load} keys`, x + sw / 2, 60);
  });

  if (recentKey && pulse > 0) {
    const targetX = recentKey.idx * shardW + shardW / 2;
    ctx.fillStyle = `rgba(110, 231, 183, ${pulse})`;
    ctx.beginPath();
    ctx.arc(targetX, 100 - pulse * 30, 6, 0, Math.PI * 2);
    ctx.fill();
    pulse -= 0.03;
  }
  requestAnimationFrame(draw);
}

document.getElementById('routeBtn').onclick = () => {
  const val = document.getElementById('keyInput').value.trim();
  if (val) routeKey(val);
};
document.getElementById('batchBtn').onclick = () => {
  const prefixes = ['user', 'order', 'session', 'product'];
  for (let i = 0; i < 20; i++) {
    routeKey(`${prefixes[i % 4]}:${Math.floor(Math.random() * 99999)}`);
  }
};
document.getElementById('clearBtn').onclick = () => {
  initShards();
  logEl.innerHTML = '';
};
shardSlider.oninput = (e) => {
  shardCount = parseInt(e.target.value);
  shardCountEl.textContent = shardCount;
  initShards();
  logEl.innerHTML = '';
};

initShards();
for (let i = 0; i < 12; i++) {
  routeKey(`user:${Math.floor(Math.random() * 9999)}`);
}
draw();