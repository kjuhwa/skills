const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
canvas.width = Math.min(window.innerWidth - 40, 900);
canvas.height = Math.min(window.innerHeight - 100, 560);

const contexts = [
  { id: 0, name: 'Orders', x: 150, y: 120, r: 58, color: '#6ee7b7' },
  { id: 1, name: 'Inventory', x: 380, y: 100, r: 52, color: '#7dd3fc' },
  { id: 2, name: 'Shipping', x: 600, y: 160, r: 50, color: '#fbbf24' },
  { id: 3, name: 'Billing', x: 250, y: 320, r: 55, color: '#f87171' },
  { id: 4, name: 'Identity', x: 520, y: 350, r: 48, color: '#c084fc' },
  { id: 5, name: 'Analytics', x: 720, y: 380, r: 45, color: '#fb923c' },
];
const relations = [
  { from: 0, to: 1, type: 'Partnership', label: 'Stock reservation' },
  { from: 0, to: 2, type: 'Customer-Supplier', label: 'Fulfillment request' },
  { from: 0, to: 3, type: 'Shared Kernel', label: 'Order totals' },
  { from: 1, to: 2, type: 'Conformist', label: 'Warehouse sync' },
  { from: 3, to: 4, type: 'ACL', label: 'Auth verification' },
  { from: 4, to: 5, type: 'Published Language', label: 'User events' },
  { from: 2, to: 5, type: 'Open Host', label: 'Tracking events' },
];
let dragging = null, ox, oy;

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  relations.forEach(r => {
    const a = contexts[r.from], b = contexts[r.to];
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = '#2a2f3a'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    ctx.fillStyle = '#444'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(r.type, mx, my - 4);
  });
  contexts.forEach(c => {
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fillStyle = c.color + '18'; ctx.fill();
    ctx.strokeStyle = c.color; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = c.color; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(c.name, c.x, c.y + 5);
  });
}

canvas.addEventListener('mousedown', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  for (const c of contexts) { if (Math.hypot(mx - c.x, my - c.y) < c.r) { dragging = c; ox = mx - c.x; oy = my - c.y; canvas.style.cursor = 'grabbing'; return; } }
});
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  if (dragging) { dragging.x = mx - ox; dragging.y = my - oy; draw(); return; }
  for (const r of relations) {
    const a = contexts[r.from], b = contexts[r.to], midx = (a.x + b.x) / 2, midy = (a.y + b.y) / 2;
    if (Math.hypot(mx - midx, my - midy) < 20) {
      tooltip.style.display = 'block'; tooltip.style.left = e.clientX + 12 + 'px'; tooltip.style.top = e.clientY + 12 + 'px';
      tooltip.innerHTML = `<strong>${r.type}</strong><br>${contexts[r.from].name} → ${contexts[r.to].name}<br><em>${r.label}</em>`; return;
    }
  }
  tooltip.style.display = 'none';
});
canvas.addEventListener('mouseup', () => { dragging = null; canvas.style.cursor = 'grab'; });
draw();