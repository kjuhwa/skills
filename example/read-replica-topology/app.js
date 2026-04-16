const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 500;
const primary = { x: 400, y: 80, label: 'Primary', qps: 0 };
const replicas = [
  { x: 150, y: 260, label: 'Replica-1', lag: 0, qps: 0 },
  { x: 400, y: 300, label: 'Replica-2', lag: 0, qps: 0 },
  { x: 650, y: 260, label: 'Replica-3', lag: 0, qps: 0 }
];
const readers = [
  { x: 80, y: 440, label: 'App-A' }, { x: 280, y: 440, label: 'App-B' },
  { x: 480, y: 440, label: 'App-C' }, { x: 680, y: 440, label: 'App-D' }
];
let packets = [];
let frame = 0;

function emit() {
  replicas.forEach(r => {
    r.lag = Math.max(0, r.lag + (Math.random() - 0.55) * 20);
    packets.push({ sx: primary.x, sy: primary.y + 20, tx: r.x, ty: r.y - 20, t: 0, type: 'wal' });
    primary.qps++;
  });
  readers.forEach(rd => {
    const rep = replicas[Math.floor(Math.random() * replicas.length)];
    packets.push({ sx: rd.x, sy: rd.y - 10, tx: rep.x, ty: rep.y + 20, t: 0, type: 'read' });
    rep.qps++;
  });
}

function drawNode(x, y, label, color, extra) {
  ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.fillStyle = color + '22'; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#c9d1d9'; ctx.font = '11px Segoe UI';
  ctx.textAlign = 'center'; ctx.fillText(label, x, y + 4);
  if (extra) { ctx.fillStyle = color; ctx.font = '10px Segoe UI'; ctx.fillText(extra, x, y + 38); }
}

function draw() {
  ctx.clearRect(0, 0, 800, 500);
  if (frame % 40 === 0) emit();
  packets = packets.filter(p => p.t <= 1);
  packets.forEach(p => {
    p.t += 0.03;
    const x = p.sx + (p.tx - p.sx) * p.t;
    const y = p.sy + (p.ty - p.sy) * p.t;
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = p.type === 'wal' ? '#6ee7b7' : '#60a5fa'; ctx.fill();
  });
  drawNode(primary.x, primary.y, primary.label, '#f59e0b', `writes: ${primary.qps}`);
  replicas.forEach(r => drawNode(r.x, r.y, r.label, '#6ee7b7', `lag: ${r.lag.toFixed(0)}ms`));
  readers.forEach(r => drawNode(r.x, r.y, r.label, '#60a5fa'));
  document.getElementById('stats').innerHTML =
    `Total writes: <span>${primary.qps}</span> | Avg lag: <span>${(replicas.reduce((s,r)=>s+r.lag,0)/3).toFixed(1)}ms</span> | Replicas: <span>${replicas.length}</span>`;
  frame++;
  requestAnimationFrame(draw);
}
draw();