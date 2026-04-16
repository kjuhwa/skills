const canvas = document.getElementById('graph');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const status = document.getElementById('status');

const nodes = [
  { id: 'orders', type: 'table', x: 120, y: 100, label: 'orders' },
  { id: 'products', type: 'table', x: 120, y: 300, label: 'products' },
  { id: 'users', type: 'table', x: 120, y: 500, label: 'users' },
  { id: 'mv_sales', type: 'mv', x: 400, y: 200, label: 'mv_daily_sales', stale: false, rows: 1843, lastRefresh: '2 min ago' },
  { id: 'mv_top', type: 'mv', x: 400, y: 420, label: 'mv_top_customers', stale: true, rows: 250, lastRefresh: '47 min ago' },
  { id: 'mv_dash', type: 'mv', x: 680, y: 310, label: 'mv_dashboard', stale: true, rows: 52, lastRefresh: '47 min ago' },
];
const edges = [
  ['orders', 'mv_sales'], ['products', 'mv_sales'], ['orders', 'mv_top'],
  ['users', 'mv_top'], ['mv_sales', 'mv_dash'], ['mv_top', 'mv_dash'],
];

function resize() { canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight - canvas.offsetTop; }
window.addEventListener('resize', resize); resize();

let hovered = null;

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  edges.forEach(([a, b]) => {
    const na = nodes.find(n => n.id === a), nb = nodes.find(n => n.id === b);
    ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
    ctx.strokeStyle = '#2d333b'; ctx.lineWidth = 2; ctx.stroke();
    const mx = (na.x + nb.x) / 2, my = (na.y + nb.y) / 2;
    const ang = Math.atan2(nb.y - na.y, nb.x - na.x);
    ctx.beginPath(); ctx.moveTo(mx + 8 * Math.cos(ang), my + 8 * Math.sin(ang));
    ctx.lineTo(mx - 6 * Math.cos(ang - 0.5), my - 6 * Math.sin(ang - 0.5));
    ctx.lineTo(mx - 6 * Math.cos(ang + 0.5), my - 6 * Math.sin(ang + 0.5));
    ctx.fillStyle = '#2d333b'; ctx.fill();
  });
  nodes.forEach(n => {
    const r = n.type === 'table' ? 24 : 30;
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    const isHov = hovered === n.id;
    if (n.type === 'table') { ctx.fillStyle = isHov ? '#2a3040' : '#1a1d27'; ctx.strokeStyle = '#484f58'; }
    else { ctx.fillStyle = n.stale ? '#3b2020' : '#1a2d27'; ctx.strokeStyle = n.stale ? '#f85149' : '#6ee7b7'; }
    ctx.lineWidth = isHov ? 3 : 2; ctx.fill(); ctx.stroke();
    ctx.fillStyle = n.type === 'mv' ? (n.stale ? '#f85149' : '#6ee7b7') : '#8b949e';
    ctx.font = '10px Segoe UI'; ctx.textAlign = 'center'; ctx.fillText(n.label, n.x, n.y + 4);
  });
}

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  hovered = null;
  for (const n of nodes) {
    if (Math.hypot(mx - n.x, my - n.y) < 32) { hovered = n.id; break; }
  }
  const n = nodes.find(nd => nd.id === hovered);
  if (n && n.type === 'mv') {
    tooltip.style.display = 'block'; tooltip.style.left = e.clientX + 12 + 'px'; tooltip.style.top = e.clientY + 12 + 'px';
    tooltip.innerHTML = `<b>${n.label}</b><br>Rows: ${n.rows}<br>Last refresh: ${n.lastRefresh}<br>Status: ${n.stale ? '🔴 Stale' : '🟢 Fresh'}`;
  } else { tooltip.style.display = 'none'; }
  draw();
});

document.getElementById('btnRefresh').onclick = () => {
  status.textContent = 'Refreshing...';
  nodes.filter(n => n.type === 'mv').forEach(n => { n.stale = false; n.lastRefresh = 'just now'; n.rows += Math.floor(Math.random() * 20); });
  setTimeout(() => { status.textContent = 'All views refreshed ✓'; draw(); }, 600);
};
draw();