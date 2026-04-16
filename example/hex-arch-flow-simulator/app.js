const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const log = document.getElementById('log');
const W = 800, H = 600, CX = W / 2, CY = H / 2;

const layers = [
  { label: 'Domain Core', r: 80, color: '#6ee7b7' },
  { label: 'Ports', r: 150, color: '#3b82f6' },
  { label: 'Adapters', r: 230, color: '#f97316' }
];

const adapters = [
  { name: 'REST API', angle: -Math.PI / 2 },
  { name: 'Database', angle: Math.PI / 6 },
  { name: 'Message Queue', angle: 5 * Math.PI / 6 },
  { name: 'gRPC', angle: -Math.PI / 6 },
  { name: 'File System', angle: 7 * Math.PI / 6 }
];

let particles = [];

function drawHex(cx, cy, r, color, label) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = color + '18';
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = 'bold 12px Segoe UI';
  ctx.fillText(label, cx - ctx.measureText(label).width / 2, cy - r + 18);
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  layers.slice().reverse().forEach(l => drawHex(CX, CY, l.r, l.color, l.label));
  adapters.forEach(a => {
    const x = CX + 270 * Math.cos(a.angle), y = CY + 270 * Math.sin(a.angle);
    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0f1117';
    ctx.font = 'bold 9px Segoe UI';
    ctx.fillText(a.name, x - ctx.measureText(a.name).width / 2, y + 3);
    ctx.strokeStyle = '#f9731644';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(CX, CY); ctx.stroke();
  });
  particles = particles.filter(p => p.t <= 1);
  particles.forEach(p => {
    p.t += 0.012;
    const x = p.sx + (CX - p.sx) * p.t, y = p.sy + (CY - p.sy) * p.t;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(110,231,183,${1 - p.t})`; ctx.fill();
  });
  requestAnimationFrame(draw);
}

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  adapters.forEach(a => {
    const x = CX + 270 * Math.cos(a.angle), y = CY + 270 * Math.sin(a.angle);
    if (Math.hypot(mx - x, my - y) < 22) {
      particles.push({ sx: x, sy: y, t: 0 });
      const ts = new Date().toLocaleTimeString();
      log.innerHTML += `<div>[${ts}] ${a.name} → Port → Domain Core (processed)</div>`;
      log.scrollTop = log.scrollHeight;
    }
  });
});
draw();