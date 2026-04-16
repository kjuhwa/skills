const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 900; canvas.height = 420;

const stages = ['Ingest','Parse','Validate','Transform','Enrich','Load'];
const stageX = stages.map((_, i) => 80 + i * 140);
const stageY = 200;
let particles = [];
let processed = 0, failed = 0;

function spawnParticle() {
  const willFail = Math.random() < 0.12;
  const failAt = willFail ? Math.floor(Math.random() * stages.length) : -1;
  particles.push({ x: stageX[0] - 40, y: stageY, stage: -1, t: 0, failAt, dead: false, color: '#6ee7b7' });
}

function update() {
  particles.forEach(p => {
    if (p.dead) return;
    p.t += 2.5;
    const next = p.stage + 1;
    const target = next < stages.length ? stageX[next] : canvas.width + 20;
    p.x += (target - p.x) * 0.04;
    if (Math.abs(p.x - target) < 3 && next < stages.length) {
      p.stage = next;
      p.t = 0;
      if (p.stage === p.failAt) { p.dead = true; p.color = '#f87171'; failed++; }
    }
    if (p.x > canvas.width + 10) { p.dead = true; processed++; }
  });
  particles = particles.filter(p => !(p.dead && p.color !== '#f87171') && p.t < 300);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // connections
  ctx.strokeStyle = '#2a2d37'; ctx.lineWidth = 2;
  for (let i = 0; i < stageX.length - 1; i++) {
    ctx.beginPath(); ctx.moveTo(stageX[i] + 30, stageY); ctx.lineTo(stageX[i + 1] - 30, stageY); ctx.stroke();
  }
  // stages
  stages.forEach((s, i) => {
    ctx.fillStyle = '#1a1d27'; ctx.strokeStyle = '#6ee7b7'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(stageX[i] - 34, stageY - 24, 68, 48, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e2e8f0'; ctx.font = '11px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText(s, stageX[i], stageY + 4);
  });
  // particles
  particles.forEach(p => {
    ctx.globalAlpha = p.dead ? Math.max(0, 1 - p.t / 60) : 1;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, stageY + (p.dead ? p.t * 0.5 : Math.sin(p.t * 0.1) * 4), 5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  });
  document.getElementById('stats').innerHTML =
    `<span>Processed: <b>${processed}</b></span><span>Failed: <b>${failed}</b></span><span>In-flight: <b>${particles.filter(p=>!p.dead).length}</b></span>`;
}

function loop() { if (Math.random() < 0.3) spawnParticle(); update(); draw(); requestAnimationFrame(loop); }
loop();