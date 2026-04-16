const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const modules = [
  { id: 'domain', x: 450, y: 270, r: 55, label: 'Domain', layer: 0, color: '#6ee7b7' },
  { id: 'appSrv', x: 450, y: 130, r: 40, label: 'App Service', layer: 1, color: '#4a9eff' },
  { id: 'useCase', x: 310, y: 200, r: 40, label: 'Use Case', layer: 1, color: '#4a9eff' },
  { id: 'port', x: 590, y: 200, r: 40, label: 'Port', layer: 1, color: '#4a9eff' },
  { id: 'rest', x: 140, y: 120, r: 45, label: 'REST Ctrl', layer: 2, color: '#ff9e4a' },
  { id: 'repo', x: 760, y: 120, r: 45, label: 'Repository', layer: 2, color: '#ff9e4a' },
  { id: 'kafka', x: 760, y: 400, r: 45, label: 'Kafka Pub', layer: 2, color: '#ff9e4a' },
  { id: 'cli', x: 140, y: 400, r: 45, label: 'CLI', layer: 2, color: '#ff9e4a' }
];

const arrows = [];
let dragStart = null;
let mouse = { x: 0, y: 0 };

function getNodeAt(x, y) {
  return modules.find(m => Math.hypot(m.x - x, m.y - y) < m.r);
}

function draw() {
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#2a2e3a';
  ctx.setLineDash([4, 4]);
  const hex = modules[0];
  [80, 140, 200].forEach(r => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const px = hex.x + r * Math.cos(a);
      const py = hex.y + r * Math.sin(a);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  });
  ctx.setLineDash([]);

  arrows.forEach(ar => drawArrow(ar.from, ar.to, ar.valid));
  if (dragStart) drawArrow(dragStart, mouse, null, true);

  modules.forEach(m => {
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f1117';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.label, m.x, m.y + 4);
  });
}

function drawArrow(from, to, valid, preview = false) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const ux = dx / len, uy = dy / len;
  const sx = from.x + (from.r || 0) * ux;
  const sy = from.y + (from.r || 0) * uy;
  const ex = to.x - (to.r || 0) * ux;
  const ey = to.y - (to.r || 0) * uy;
  ctx.strokeStyle = preview ? '#9aa0ad' : (valid === null ? '#9aa0ad' : valid ? '#6ee7b7' : '#ff6b6b');
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  const ang = Math.atan2(ey - sy, ex - sx);
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - 10 * Math.cos(ang - 0.4), ey - 10 * Math.sin(ang - 0.4));
  ctx.lineTo(ex - 10 * Math.cos(ang + 0.4), ey - 10 * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
}

canvas.addEventListener('mousedown', e => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);
  const n = getNodeAt(x, y);
  if (n) dragStart = n;
});
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * (W / rect.width);
  mouse.y = (e.clientY - rect.top) * (H / rect.height);
  if (dragStart) draw();
});
canvas.addEventListener('mouseup', e => {
  if (!dragStart) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);
  const target = getNodeAt(x, y);
  if (target && target.id !== dragStart.id) {
    const valid = target.layer < dragStart.layer;
    arrows.push({ from: dragStart, to: target, valid });
    updateScore();
  }
  dragStart = null;
  draw();
});

function updateScore() {
  const inward = arrows.filter(a => a.valid).length;
  const outward = arrows.filter(a => !a.valid).length;
  document.getElementById('inward').textContent = inward;
  document.getElementById('outward').textContent = outward;
  document.getElementById('violations').textContent = outward;
}

document.getElementById('validate').onclick = () => {
  const v = document.getElementById('verdict');
  const outward = arrows.filter(a => !a.valid).length;
  if (arrows.length === 0) {
    v.className = ''; v.textContent = 'Draw at least one dependency arrow.';
  } else if (outward === 0) {
    v.className = 'pass';
    v.textContent = `✓ Architecture is hexagonal — all ${arrows.length} dependencies point inward.`;
  } else {
    v.className = 'fail';
    v.textContent = `✗ ${outward} violation(s). Outer layers must not be depended upon by inner layers.`;
  }
};
document.getElementById('reset').onclick = () => {
  arrows.length = 0;
  updateScore();
  document.getElementById('verdict').className = '';
  document.getElementById('verdict').textContent = '';
  draw();
};

draw();