const SHARD_COUNT = 6;
const gridEl = document.getElementById('shardGrid');
const canvas = document.getElementById('timeline');
const ctx = canvas.getContext('2d');
const opsEl = document.getElementById('opsCount');

let shards = [];
let history = [];
let paused = false;
let hotShardId = -1;
let hotTimer = 0;
let strategy = 'range';
let loadFactor = 8;

const REGIONS = ['US-East', 'US-West', 'EU-West', 'EU-North', 'APAC-S', 'APAC-N'];

function initShards() {
  shards = [];
  gridEl.innerHTML = '';
  for (let i = 0; i < SHARD_COUNT; i++) {
    const s = {
      id: i,
      region: REGIONS[i],
      qps: 0,
      latency: 0,
      storage: 40 + Math.random() * 30,
      hot: false
    };
    shards.push(s);
    const card = document.createElement('div');
    card.className = 'shard';
    card.id = `shard-${i}`;
    card.innerHTML = `
      <h3>Shard-${i} (${s.region})</h3>
      <div class="metric"><span>QPS</span><span class="v-qps">0</span></div>
      <div class="metric"><span>Latency</span><span class="v-lat">0ms</span></div>
      <div class="metric"><span>Storage</span><span class="v-st">0%</span></div>
      <div class="gauge"><div class="gauge-fill"></div></div>
    `;
    gridEl.appendChild(card);
  }
}

function getShardWeight(id) {
  if (strategy === 'range') return id === 0 || id === SHARD_COUNT - 1 ? 1.5 : 1;
  if (strategy === 'hash') return 1;
  if (strategy === 'geo') return [1.8, 0.6, 1.4, 0.5, 1.2, 0.5][id];
  return 1;
}

function tick() {
  if (paused) return;
  let totalOps = 0;
  shards.forEach((s, i) => {
    const base = loadFactor * 10 * getShardWeight(i);
    const noise = (Math.random() - 0.5) * 20;
    let qps = Math.max(0, base + noise);
    if (i === hotShardId && hotTimer > 0) {
      qps *= 4 + Math.random() * 2;
      s.hot = true;
    } else {
      s.hot = false;
    }
    s.qps = Math.round(qps);
    s.latency = Math.round(5 + qps * 0.1 + Math.random() * 8);
    s.storage = Math.min(99, s.storage + Math.random() * 0.05);
    totalOps += s.qps;
    const card = document.getElementById(`shard-${i}`);
    card.classList.toggle('hot', s.hot);
    card.querySelector('.v-qps').textContent = s.qps;
    card.querySelector('.v-lat').textContent = s.latency + 'ms';
    card.querySelector('.v-st').textContent = s.storage.toFixed(0) + '%';
    const fill = card.querySelector('.gauge-fill');
    const pct = Math.min(100, s.qps / 4);
    fill.style.width = pct + '%';
    fill.style.background = pct > 80 ? '#ff6b6b' : pct > 50 ? '#f7b955' : '#6ee7b7';
  });
  opsEl.textContent = totalOps.toLocaleString();
  history.push(shards.map(s => s.qps));
  if (history.length > 120) history.shift();
  if (hotTimer > 0) hotTimer--;
  else hotShardId = -1;
  drawTimeline();
}

function drawTimeline() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (history.length < 2) return;
  const w = canvas.width, h = canvas.height;
  const step = w / 120;
  const max = Math.max(50, ...history.flat());
  const colors = ['#6ee7b7', '#7cc5ff', '#f7b955', '#e88aa5', '#c097f6', '#5fd2c4'];
  for (let s = 0; s < SHARD_COUNT; s++) {
    ctx.strokeStyle = colors[s];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    history.forEach((pt, idx) => {
      const x = idx * step;
      const y = h - (pt[s] / max) * (h - 20) - 10;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  ctx.fillStyle = '#8a8f9c';
  ctx.font = '11px sans-serif';
  ctx.fillText('QPS over time', 10, 18);
}

document.getElementById('strategy').onchange = (e) => {
  strategy = e.target.value;
  shards.forEach(s => s.storage = 40 + Math.random() * 30);
};
document.getElementById('loadSlider').oninput = (e) => loadFactor = +e.target.value;
document.getElementById('hotspot').onclick = () => {
  hotShardId = Math.floor(Math.random() * SHARD_COUNT);
  hotTimer = 30;
};
document.getElementById('rebalance').onclick = () => {
  const avg = shards.reduce((a, s) => a + s.storage, 0) / SHARD_COUNT;
  shards.forEach(s => s.storage = avg + (Math.random() - 0.5) * 5);
};
const pauseBtn = document.getElementById('pause');
pauseBtn.onclick = () => {
  paused = !paused;
  pauseBtn.textContent = paused ? 'Resume' : 'Pause';
};

initShards();
setInterval(tick, 500);