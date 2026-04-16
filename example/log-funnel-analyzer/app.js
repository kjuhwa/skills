const stages = [
  { name: 'Ingested', count: 128420 },
  { name: 'Parsed', count: 125800 },
  { name: 'Filtered', count: 98340 },
  { name: 'Enriched', count: 97200 },
  { name: 'Indexed', count: 96850 }
];
const sources = [
  { name: 'nginx', count: 42100 }, { name: 'app-server', count: 35800 },
  { name: 'db-audit', count: 22300 }, { name: 'cron-jobs', count: 15600 },
  { name: 'cdn-edge', count: 12620 }
];
const errors = ['JSON parse failure (2,620)', 'Missing timestamp field (1,440)', 'Regex mismatch on host (980)', 'Payload > 1MB dropped (560)'];

const canvas = document.getElementById('funnel');
const ctx = canvas.getContext('2d');
canvas.width = 420; canvas.height = 340;

function drawFunnel() {
  const max = stages[0].count, cy = 30, ch = 52;
  stages.forEach((s, i) => {
    const ratio = s.count / max;
    const w = 80 + ratio * 280, x = (420 - w) / 2;
    ctx.fillStyle = i === stages.length - 1 ? '#6ee7b7' : `rgba(110,231,183,${0.25 + ratio * 0.4})`;
    ctx.beginPath();
    ctx.roundRect(x, cy + i * ch, w, ch - 6, 6);
    ctx.fill();
    ctx.fillStyle = '#0f1117'; ctx.font = 'bold 12px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText(s.name, 210, cy + i * ch + 20);
    ctx.font = '11px Segoe UI';
    ctx.fillText(s.count.toLocaleString(), 210, cy + i * ch + 36);
    if (i > 0) {
      const drop = ((stages[i - 1].count - s.count) / stages[i - 1].count * 100).toFixed(1);
      ctx.fillStyle = '#f87171'; ctx.font = '10px Segoe UI'; ctx.textAlign = 'left';
      ctx.fillText(`-${drop}%`, (420 + w) / 2 + 8, cy + i * ch + 14);
    }
  });
}

function renderStats() {
  const el = document.getElementById('stats');
  const dropped = stages[0].count - stages[stages.length - 1].count;
  const pct = (dropped / stages[0].count * 100).toFixed(1);
  el.innerHTML = `<div class="stat"><b>${stages[0].count.toLocaleString()}</b> total ingested</div>` +
    `<div class="stat"><b>${stages[stages.length - 1].count.toLocaleString()}</b> successfully indexed</div>` +
    `<div class="stat"><b style="color:#f87171">${dropped.toLocaleString()}</b> dropped (${pct}%)</div>`;
}

function renderPatterns() {
  document.getElementById('patterns').innerHTML = errors.map(e => `<div class="pattern">• ${e}</div>`).join('');
}

function renderBars() {
  const max = Math.max(...sources.map(s => s.count));
  document.getElementById('bars').innerHTML = sources.map(s =>
    `<div class="bar-row"><span class="bar-label">${s.name}</span>` +
    `<div class="bar-track"><div class="bar-fill" style="width:${s.count / max * 100}%"></div></div>` +
    `<span class="bar-val">${(s.count / 1000).toFixed(1)}k</span></div>`
  ).join('');
}

drawFunnel(); renderStats(); renderPatterns(); renderBars();