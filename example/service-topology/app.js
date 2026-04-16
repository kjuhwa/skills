const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
let W, H;

function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
resize();
addEventListener('resize', resize);

const names = ['gateway','auth','users','orders','payments','inventory','notifications','cache','db-primary','db-replica'];
const nodes = names.map((n, i) => {
  const angle = (i / names.length) * Math.PI * 2;
  const r = Math.min(W, H) * 0.3;
  return { name: n, x: W / 2 + Math.cos(angle) * r, y: H / 2 + Math.sin(angle) * r, r: 18 + Math.random() * 10, rps: Math.floor(Math.random() * 500) };
});

const edges = [];
for (let i = 0; i < nodes.length; i++) {
  const targets = new Set();
  const count = 1 + Math.floor(Math.random() * 3);
  for (let c = 0; c < count; c++) {
    let j = Math.floor(Math.random() * nodes.length);
    if (j !== i && !targets.has(j)) { targets.add(j); edges.push({ from: i, to: j, latency: 1 + Math.floor(Math.random() * 80) }); }
  }
}

const particles = [];

function spawnParticle() {
  const e = edges[Math.floor(Math.random() * edges.length)];
  particles.push({ e, t: 0, speed: 0.005 + Math.random() * 0.015 });
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  edges.forEach(e => {
    const a = nodes[e.from], b = nodes[e.to];
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = 'rgba(110,231,183,0.12)'; ctx.lineWidth = 1; ctx.stroke();
  });
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.t += p.speed;
    if (p.t > 1) { particles.splice(i, 1); continue; }
    const a = nodes[p.e.from], b = nodes[p.e.to];
    const x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(110,231,183,${1 - p.t})`; ctx.fill();
  }
  nodes.forEach(n => {
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1d27'; ctx.fill();
    ctx.strokeStyle = '#6ee7b7'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#c9d1d9'; ctx.font = '10px Courier New'; ctx.textAlign = 'center';
    ctx.fillText(n.name, n.x, n.y + 3);
  });
  if (Math.random() < 0.3) spawnParticle();
  requestAnimationFrame(draw);
}

canvas.addEventListener('mousemove', e => {
  const hit = nodes.find(n => Math.hypot(e.clientX - n.x, e.clientY - n.y) < n.r);
  if (hit) {
    tooltip.style.display = 'block';
    tooltip.style.left = e.clientX + 12 + 'px';
    tooltip.style.top = e.clientY + 12 + 'px';
    tooltip.innerHTML = `<b style="color:#6ee7b7">${hit.name}</b><br>${hit.rps} req/s`;
  } else { tooltip.style.display = 'none'; }
});

draw();