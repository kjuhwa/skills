const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
let W, H;
function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
resize(); addEventListener('resize', resize);

const names = ['gateway','auth','users','orders','payments','inventory','notifications','cache'];
const nodes = names.map((name, i) => {
  const angle = (i / names.length) * Math.PI * 2 - Math.PI / 2;
  const rx = Math.min(W, H) * 0.3;
  return { name, x: W/2 + Math.cos(angle)*rx, y: H/2 + Math.sin(angle)*rx, r: 22, rps: Math.floor(Math.random()*500+50), latency: Math.floor(Math.random()*200+5) };
});
const edges = [];
for (let i = 0; i < nodes.length; i++) {
  const count = 1 + Math.floor(Math.random()*2);
  for (let c = 0; c < count; c++) {
    let j = (i + 1 + Math.floor(Math.random()*(nodes.length-1))) % nodes.length;
    edges.push({ from: i, to: j, rate: Math.floor(Math.random()*300+10) });
  }
}
const particles = [];
function spawnParticle() {
  const e = edges[Math.floor(Math.random()*edges.length)];
  particles.push({ e, t: 0, speed: 0.005 + Math.random()*0.01 });
}
function draw() {
  ctx.clearRect(0, 0, W, H);
  edges.forEach(e => {
    const a = nodes[e.from], b = nodes[e.to];
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = 'rgba(110,231,183,0.15)'; ctx.lineWidth = 1; ctx.stroke();
  });
  particles.forEach(p => {
    const a = nodes[p.e.from], b = nodes[p.e.to];
    const x = a.x + (b.x - a.x) * p.t;
    const y = a.y + (b.y - a.y) * p.t;
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2);
    ctx.fillStyle = '#6ee7b7'; ctx.fill();
    p.t += p.speed;
  });
  for (let i = particles.length-1; i >= 0; i--) if (particles[i].t > 1) particles.splice(i, 1);
  nodes.forEach(n => {
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI*2);
    ctx.fillStyle = '#1a1d27'; ctx.strokeStyle = '#6ee7b7'; ctx.lineWidth = 2;
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c9d1d9'; ctx.font = '10px Consolas'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(n.name, n.x, n.y);
  });
  if (Math.random() < 0.3) spawnParticle();
  requestAnimationFrame(draw);
}
draw();
canvas.addEventListener('mousemove', e => {
  const hit = nodes.find(n => Math.hypot(e.clientX - n.x, e.clientY - n.y) < n.r);
  if (hit) {
    tooltip.style.display = 'block';
    tooltip.style.left = e.clientX + 12 + 'px';
    tooltip.style.top = e.clientY + 12 + 'px';
    tooltip.innerHTML = `<b style="color:#6ee7b7">${hit.name}</b><br>${hit.rps} req/s · ${hit.latency}ms p99`;
  } else { tooltip.style.display = 'none'; }
});