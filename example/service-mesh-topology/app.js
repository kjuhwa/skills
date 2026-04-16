const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = Math.min(window.innerWidth - 40, 900);
canvas.height = Math.min(window.innerHeight - 100, 600);

const names = ['api-gw','auth','users','orders','payments','inventory','notifications','cache','logging','search'];
const nodes = names.map((name, i) => {
  const angle = (i / names.length) * Math.PI * 2;
  const r = Math.min(canvas.width, canvas.height) * 0.32;
  return { name, x: canvas.width/2 + Math.cos(angle)*r, y: canvas.height/2 + Math.sin(angle)*r, rps: Math.random()*500|0, health: Math.random() > 0.15 ? 'healthy' : 'degraded' };
});

const edges = [];
for (let i = 0; i < nodes.length; i++) {
  const count = 1 + (Math.random()*3|0);
  for (let j = 0; j < count; j++) { let t = (i+1+j) % nodes.length; edges.push({ from: i, to: t, latency: 2+Math.random()*60|0, particles: [] }); }
}

function spawnParticle(edge) { edge.particles.push({ t: 0, speed: 0.005 + Math.random()*0.01 }); }
edges.forEach(e => { for(let i=0;i<3;i++) spawnParticle(e); });

const stats = document.getElementById('stats');
stats.innerHTML = `<span>Nodes: ${nodes.length}</span><span>Connections: ${edges.length}</span><span>Sidecar proxies: ${nodes.length}</span>`;

let time = 0;
function draw() {
  ctx.fillStyle = '#0f1117'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  edges.forEach(e => {
    const a = nodes[e.from], b = nodes[e.to];
    ctx.strokeStyle = 'rgba(110,231,183,0.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    e.particles.forEach(p => {
      p.t += p.speed;
      if (p.t > 1) p.t = 0;
      const px = a.x + (b.x - a.x)*p.t, py = a.y + (b.y - a.y)*p.t;
      ctx.fillStyle = '#6ee7b7'; ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI*2); ctx.fill();
    });
    if (Math.random() < 0.02) spawnParticle(e);
  });
  nodes.forEach(n => {
    const pulse = Math.sin(time*0.05) * 3;
    ctx.fillStyle = n.health === 'healthy' ? 'rgba(110,231,183,0.15)' : 'rgba(239,68,68,0.15)';
    ctx.beginPath(); ctx.arc(n.x, n.y, 24+pulse, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = n.health === 'healthy' ? '#6ee7b7' : '#ef4444';
    ctx.beginPath(); ctx.arc(n.x, n.y, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e2e8f0'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n.name, n.x, n.y + 22);
    ctx.fillStyle = '#64748b'; ctx.font = '9px sans-serif'; ctx.fillText(n.rps+' rps', n.x, n.y + 33);
  });
  time++; requestAnimationFrame(draw);
}
draw();