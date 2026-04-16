const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const servers = [
  { x: 700, y: 80, load: 0, maxLoad: 10, name: 'Server A' },
  { x: 700, y: 200, load: 0, maxLoad: 8, name: 'Server B' },
  { x: 700, y: 320, load: 0, maxLoad: 12, name: 'Server C' },
  { x: 700, y: 440, load: 0, maxLoad: 6, name: 'Server D' }
];
const particles = [];
let rrIndex = 0;

function pickServer(algo) {
  if (algo === 'round-robin') { const s = servers[rrIndex % servers.length]; rrIndex++; return s; }
  if (algo === 'least-conn') return servers.reduce((a, b) => a.load < b.load ? a : b);
  return servers[Math.floor(Math.random() * servers.length)];
}

function sendRequest() {
  const algo = document.getElementById('algo').value;
  const srv = pickServer(algo);
  srv.load = Math.min(srv.load + 1, srv.maxLoad);
  particles.push({ x: 100, y: 250, tx: srv.x, ty: srv.y, progress: 0, server: srv });
}

document.getElementById('sendReq').onclick = sendRequest;
document.getElementById('burst').onclick = () => { for (let i = 0; i < 10; i++) setTimeout(sendRequest, i * 80); };

function draw() {
  ctx.clearRect(0, 0, 900, 500);
  // LB box
  ctx.fillStyle = '#6ee7b7'; ctx.fillRect(370, 220, 60, 60); ctx.fillStyle = '#0f1117';
  ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('LB', 400, 255);
  // Client
  ctx.fillStyle = '#c9d1d9'; ctx.font = '13px sans-serif'; ctx.fillText('Clients', 100, 255);
  ctx.strokeStyle = '#333'; ctx.beginPath(); ctx.moveTo(140, 250); ctx.lineTo(370, 250); ctx.stroke();
  // Servers
  servers.forEach(s => {
    const pct = s.load / s.maxLoad;
    const color = pct > 0.8 ? '#f87171' : pct > 0.5 ? '#fbbf24' : '#6ee7b7';
    ctx.fillStyle = '#1a1d27'; ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.strokeRect(s.x, s.y - 20, 140, 40); ctx.fillRect(s.x, s.y - 20, 140, 40);
    ctx.fillStyle = color; ctx.fillRect(s.x + 2, s.y - 18, 136 * pct, 36);
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${s.name} (${s.load}/${s.maxLoad})`, s.x + 70, s.y + 5);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(430, 250); ctx.lineTo(s.x, s.y); ctx.stroke();
  });
  // Particles
  particles.forEach((p, i) => {
    p.progress += 0.02;
    if (p.progress < 0.5) { p.x = 100 + (400 - 100) * (p.progress * 2); p.y = 250; }
    else { const t = (p.progress - 0.5) * 2; p.x = 400 + (p.tx - 400) * t; p.y = 250 + (p.ty - 250) * t; }
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fillStyle = '#6ee7b7'; ctx.fill();
    if (p.progress >= 1) { particles.splice(i, 1); setTimeout(() => { p.server.load = Math.max(0, p.server.load - 1); }, 1500); }
  });
  requestAnimationFrame(draw);
}
draw();
setInterval(sendRequest, 2000);