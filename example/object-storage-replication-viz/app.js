const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;
const regions = [
  { id: 'us-east', x: 150, y: 250, color: '#6ee7b7', primary: true },
  { id: 'eu-west', x: 600, y: 120, color: '#60a5fa' },
  { id: 'ap-south', x: 700, y: 360, color: '#fbbf24' },
  { id: 'sa-east', x: 500, y: 430, color: '#f87171' },
];
let objects = [];
let stats = { total: 0, replicated: 0 };
let id = 0;
function log(msg, ok) {
  const el = document.getElementById('log');
  const d = document.createElement('div');
  d.className = ok ? 'ok' : '';
  d.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.prepend(d);
  if (el.children.length > 40) el.lastChild.remove();
}
function upload() {
  const oid = (++id).toString(36).padStart(4, '0');
  const lat = +document.getElementById('lat').value;
  log(`PUT object-${oid} → us-east (primary)`);
  stats.total += regions.length - 1;
  document.getElementById('tot').textContent = stats.total;
  regions.filter(r => !r.primary).forEach(r => {
    objects.push({
      id: oid, from: regions[0], to: r,
      start: performance.now(),
      duration: lat + Math.random() * 400,
    });
  });
}
function drawRegion(r) {
  ctx.beginPath();
  ctx.arc(r.x, r.y, 40, 0, Math.PI * 2);
  ctx.fillStyle = '#0f1117';
  ctx.fill();
  ctx.strokeStyle = r.color;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = r.color;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(r.id, r.x, r.y + 4);
  if (r.primary) {
    ctx.font = '10px sans-serif';
    ctx.fillText('PRIMARY', r.x, r.y + 18);
  }
}
function frame() {
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(0, 0, W, H);
  regions.forEach(r => regions.forEach(r2 => {
    if (r === r2 || !r.primary) return;
    ctx.strokeStyle = '#2a2f3d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r2.x, r2.y);
    ctx.stroke();
  }));
  const now = performance.now();
  objects = objects.filter(o => {
    const t = (now - o.start) / o.duration;
    if (t >= 1) {
      stats.replicated++;
      document.getElementById('rep').textContent = stats.replicated;
      log(`✓ object-${o.id} replicated to ${o.to.id}`, true);
      return false;
    }
    const x = o.from.x + (o.to.x - o.from.x) * t;
    const y = o.from.y + (o.to.y - o.from.y) * t;
    ctx.fillStyle = o.to.color;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 12;
    ctx.shadowColor = o.to.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    return true;
  });
  regions.forEach(drawRegion);
  requestAnimationFrame(frame);
}
document.getElementById('upload').onclick = upload;
document.getElementById('burst').onclick = () => { for (let i = 0; i < 10; i++) setTimeout(upload, i * 80); };
frame();
upload();