const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const log = document.getElementById('log');
const cx = 400, cy = 280, R = 160;

const ports = [
  { name: 'HTTP In', angle: Math.PI, type: 'driving' },
  { name: 'CLI In', angle: Math.PI * 1.2, type: 'driving' },
  { name: 'DB Out', angle: 0, type: 'driven' },
  { name: 'Email Out', angle: -Math.PI * 0.3, type: 'driven' }
];
const adapters = [
  { port: 0, name: 'Express Adapter' },
  { port: 1, name: 'Yargs Adapter' },
  { port: 2, name: 'Postgres Adapter' },
  { port: 3, name: 'SMTP Adapter' }
];
let particles = [];

function hexPoint(cx, cy, r, i) {
  const a = Math.PI / 3 * i - Math.PI / 6;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function drawHex(cx, cy, r, stroke, fill) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const [x, y] = hexPoint(cx, cy, r, i); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
}

function portPos(p) {
  return { x: cx + R * Math.cos(p.angle), y: cy + R * Math.sin(p.angle) };
}

function draw() {
  ctx.clearRect(0, 0, 800, 600);
  drawHex(cx, cy, R, '#6ee7b7', 'rgba(110,231,183,0.05)');
  drawHex(cx, cy, R * 0.5, '#2d333b', 'rgba(110,231,183,0.02)');
  ctx.fillStyle = '#6ee7b7'; ctx.font = 'bold 13px Segoe UI';
  ctx.textAlign = 'center'; ctx.fillText('Domain Core', cx, cy + 5);

  ports.forEach((p, i) => {
    const pos = portPos(p);
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = p.type === 'driving' ? '#6ee7b7' : '#f59e0b'; ctx.fill();
    ctx.fillStyle = '#c9d1d9'; ctx.font = '11px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText(p.name, pos.x, pos.y - 16);
    const a = adapters.find(a => a.port === i);
    if (a) {
      const ax = cx + (R + 70) * Math.cos(p.angle), ay = cy + (R + 70) * Math.sin(p.angle);
      ctx.strokeStyle = '#2d333b'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pos.x, pos.y); ctx.lineTo(ax, ay); ctx.stroke();
      ctx.fillStyle = '#1a1d27'; ctx.strokeStyle = '#6ee7b7';
      ctx.beginPath(); ctx.roundRect(ax - 50, ay - 12, 100, 24, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9d1d9'; ctx.font = '10px Segoe UI'; ctx.fillText(a.name, ax, ay + 4);
    }
  });

  particles = particles.filter(p => p.t < 1);
  particles.forEach(p => {
    p.t += 0.02;
    const x = p.sx + (p.ex - p.sx) * p.t, y = p.sy + (p.ey - p.sy) * p.t;
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(110,231,183,${1 - p.t})`; ctx.fill();
  });
  requestAnimationFrame(draw);
}

function addLog(msg) {
  const d = document.createElement('div');
  d.innerHTML = `<span class="time">${new Date().toLocaleTimeString()}</span> ${msg}`;
  log.prepend(d);
}

document.getElementById('btnSimulate').onclick = () => {
  const dp = ports.find(p => p.type === 'driving');
  const drv = ports.find(p => p.type === 'driven');
  if (!dp || !drv) return;
  const s = portPos(dp), e = { x: cx, y: cy };
  const e2 = portPos(drv);
  particles.push({ sx: s.x - 70, sy: s.y, ex: cx, ey: cy, t: 0 });
  setTimeout(() => particles.push({ sx: cx, sy: cy, ex: e2.x + 70, ey: e2.y, t: 0 }), 600);
  addLog(`Request: ${dp.name} → Domain Core → ${drv.name}`);
};

document.getElementById('btnAddPort').onclick = () => {
  const a = Math.random() * Math.PI * 2;
  const t = Math.random() > 0.5 ? 'driving' : 'driven';
  ports.push({ name: `Port ${ports.length}`, angle: a, type: t });
  addLog(`Added ${t} port at angle ${(a * 180 / Math.PI).toFixed(0)}°`);
};

document.getElementById('btnAddAdapter').onclick = () => {
  const unlinked = ports.findIndex((_, i) => !adapters.find(a => a.port === i));
  if (unlinked >= 0) {
    adapters.push({ port: unlinked, name: `Adapter ${adapters.length}` });
    addLog(`Linked adapter to ${ports[unlinked].name}`);
  }
};

draw();
addLog('System initialized with 4 ports and 4 adapters');