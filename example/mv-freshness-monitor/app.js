const views = [
  { name: 'mv_daily_revenue', src: 'orders, payments', rows: 12480, refreshSec: 300, elapsed: 45, history: [] },
  { name: 'mv_user_activity', src: 'events, users', rows: 89200, refreshSec: 600, elapsed: 580, history: [] },
  { name: 'mv_inventory_snapshot', src: 'products, warehouses', rows: 3400, refreshSec: 120, elapsed: 110, history: [] },
  { name: 'mv_top_sellers', src: 'orders, products', rows: 500, refreshSec: 900, elapsed: 920, history: [] },
  { name: 'mv_funnel_metrics', src: 'events, conversions', rows: 1560, refreshSec: 180, elapsed: 30, history: [] },
  { name: 'mv_geo_breakdown', src: 'orders, addresses', rows: 7800, refreshSec: 3600, elapsed: 3500, history: [] },
];

views.forEach(v => { for (let i = 0; i < 20; i++) v.history.push(Math.random() * v.refreshSec); });

const grid = document.getElementById('grid');

function statusClass(v) { const pct = v.elapsed / v.refreshSec; return pct > 1 ? 'stale' : pct > 0.8 ? 'warning' : ''; }
function barColor(v) { const pct = v.elapsed / v.refreshSec; return pct > 1 ? '#f85149' : pct > 0.8 ? '#d29922' : '#6ee7b7'; }
function fmtTime(s) { return s >= 60 ? Math.floor(s / 60) + 'm ' + (s % 60) + 's' : s + 's'; }

function drawSparkline(canvas, data, max) {
  const c = canvas.getContext('2d'); const w = canvas.width = canvas.offsetWidth; const h = canvas.height = 30;
  c.clearRect(0, 0, w, h);
  c.beginPath();
  data.forEach((v, i) => { const x = (i / (data.length - 1)) * w; const y = h - (v / max) * (h - 4); i === 0 ? c.moveTo(x, y) : c.lineTo(x, y); });
  c.strokeStyle = '#6ee7b7'; c.lineWidth = 1.5; c.stroke();
}

function render() {
  grid.innerHTML = '';
  views.forEach((v, idx) => {
    const pct = Math.min(v.elapsed / v.refreshSec, 1.2);
    const card = document.createElement('div');
    card.className = 'card ' + statusClass(v);
    card.innerHTML = `<h2>${v.name}</h2>
      <div class="meta">Sources: ${v.src} · ${v.rows.toLocaleString()} rows</div>
      <div class="bar-bg"><div class="bar-fg" style="width:${Math.min(pct * 100, 100)}%;background:${barColor(v)}"></div></div>
      <div class="meta">${fmtTime(v.elapsed)} / ${fmtTime(v.refreshSec)} cycle</div>
      <canvas class="sparkline" id="sp${idx}"></canvas>
      <div class="actions"><button data-i="${idx}">⟳ Refresh</button></div>`;
    grid.appendChild(card);
  });
  views.forEach((v, i) => drawSparkline(document.getElementById('sp' + i), v.history, v.refreshSec));
  document.querySelectorAll('[data-i]').forEach(btn => btn.onclick = () => {
    const v = views[btn.dataset.i]; v.elapsed = 0; v.rows += Math.floor(Math.random() * 50); v.history.push(0); v.history.shift(); render();
  });
}

render();
setInterval(() => { views.forEach(v => { v.elapsed += 5; v.history.push(v.elapsed); v.history.shift(); }); render(); }, 5000);