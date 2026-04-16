const latSlider = document.getElementById('lat');
const rateSlider = document.getElementById('rate');
const latVal = document.getElementById('lat-val');
const rateVal = document.getElementById('rate-val');
const toggleBtn = document.getElementById('toggle');
let paused = false;
toggleBtn.onclick = () => { paused = !paused; toggleBtn.textContent = paused ? 'Run' : 'Pause'; };

function makePool(cap) {
  return { cap, busy: 0, completedFast: 0, completedSlow: 0, rejected: 0, wait: [] };
}

const shared = { pool: makePool(20) };
const bulk = { fast: makePool(10), slow: makePool(10) };

function schedule(pool, kind, latency) {
  if (pool.busy >= pool.cap) { pool.rejected++; return; }
  pool.busy++;
  setTimeout(() => {
    pool.busy--;
    if (kind === 'fast') pool.completedFast++; else pool.completedSlow++;
  }, latency);
}

function tick() {
  if (paused) return;
  const slowLat = +latSlider.value;
  const fastLat = 30;
  const rate = +rateSlider.value;
  const perFrame = rate / 60;
  let budget = perFrame;
  while (budget > 0) {
    if (budget < 1 && Math.random() > budget) break;
    const kind = Math.random() < 0.5 ? 'fast' : 'slow';
    const lat = kind === 'fast' ? fastLat : slowLat;
    schedule(shared.pool, kind, lat);
    schedule(kind === 'fast' ? bulk.fast : bulk.slow, kind, lat);
    budget--;
  }
}

function drawPools(ctx, pools, width, height) {
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(0, 0, width, height);
  const barY = 40;
  let xOffset = 20;
  pools.forEach(({ pool, label, color }) => {
    const slotW = (width - 60) / pools.length;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Consolas';
    ctx.fillText(label, xOffset, 24);
    ctx.fillText(`${pool.busy}/${pool.cap} busy`, xOffset, 38);
    const slotsPerRow = 5;
    const size = 26;
    for (let i = 0; i < pool.cap; i++) {
      const row = Math.floor(i / slotsPerRow);
      const col = i % slotsPerRow;
      const sx = xOffset + col * (size + 4);
      const sy = barY + 20 + row * (size + 4);
      ctx.fillStyle = i < pool.busy ? color : '#242938';
      ctx.fillRect(sx, sy, size, size);
    }
    xOffset += slotW;
  });
}

const sharedCtx = document.getElementById('shared').getContext('2d');
const bulkCtx = document.getElementById('bulk').getContext('2d');
const history = { sharedFast: [], sharedSlow: [], bulkFast: [], bulkSlow: [] };
let lastSample = { sf: 0, ss: 0, bf: 0, bs: 0 };

function sample() {
  const now = {
    sf: shared.pool.completedFast, ss: shared.pool.completedSlow,
    bf: bulk.fast.completedFast,   bs: bulk.slow.completedSlow
  };
  history.sharedFast.push(now.sf - lastSample.sf);
  history.sharedSlow.push(now.ss - lastSample.ss);
  history.bulkFast.push(now.bf - lastSample.bf);
  history.bulkSlow.push(now.bs - lastSample.bs);
  Object.values(history).forEach(arr => { if (arr.length > 80) arr.shift(); });
  lastSample = now;
}

function drawChart(ctx, fast, slow, w, h) {
  const max = Math.max(5, ...fast, ...slow);
  const barW = (w - 40) / 80;
  const chartY = 140;
  ctx.strokeStyle = '#242938';
  ctx.beginPath(); ctx.moveTo(20, chartY + 100); ctx.lineTo(w - 20, chartY + 100); ctx.stroke();
  function plot(arr, color) {
    ctx.fillStyle = color;
    arr.forEach((v, i) => {
      const bh = (v / max) * 100;
      ctx.fillRect(20 + i * barW, chartY + 100 - bh, barW - 1, bh);
    });
  }
  plot(fast, '#6ee7b7');
  plot(slow, '#f87171');
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Consolas';
  ctx.fillText('throughput / tick (fast green, slow red)', 20, chartY + 118);
}

function render() {
  drawPools(sharedCtx,
    [{ pool: shared.pool, label: 'shared 20', color: '#6ee7b7' }],
    420, 260);
  drawChart(sharedCtx, history.sharedFast, history.sharedSlow, 420, 260);

  drawPools(bulkCtx,
    [{ pool: bulk.fast, label: 'fast 10', color: '#6ee7b7' },
     { pool: bulk.slow, label: 'slow 10', color: '#f87171' }],
    420, 260);
  drawChart(bulkCtx, history.bulkFast, history.bulkSlow, 420, 260);

  document.getElementById('shared-stats').textContent =
    `fast ok ${shared.pool.completedFast}  |  slow ok ${shared.pool.completedSlow}  |  rejected ${shared.pool.rejected}`;
  document.getElementById('bulk-stats').textContent =
    `fast ok ${bulk.fast.completedFast}  |  slow ok ${bulk.slow.completedSlow}  |  rejected fast ${bulk.fast.rejected} / slow ${bulk.slow.rejected}`;
}

latSlider.oninput  = () => latVal.textContent  = latSlider.value;
rateSlider.oninput = () => rateVal.textContent = rateSlider.value;

setInterval(tick, 16);
setInterval(sample, 250);
setInterval(render, 80);