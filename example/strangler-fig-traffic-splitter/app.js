const slider = document.getElementById('split');
const legacyCanvas = document.getElementById('legacy-chart');
const modernCanvas = document.getElementById('modern-chart');
const flowCanvas = document.getElementById('flow');
const lCtx = legacyCanvas.getContext('2d');
const mCtx = modernCanvas.getContext('2d');
const fCtx = flowCanvas.getContext('2d');

const legacyHistory = [];
const modernHistory = [];
let packets = [];

function updateLabels() {
  const legacy = 100 - slider.value;
  const modern = slider.value;
  document.getElementById('legacy-pct').textContent = legacy + '%';
  document.getElementById('modern-pct').textContent = modern + '%';
}
slider.oninput = updateLabels;
updateLabels();

function drawChart(ctx, data, color) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#2a2e3d';
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0, h*i/4); ctx.lineTo(w, h*i/4);
    ctx.stroke();
  }
  if (data.length < 2) return;
  const max = Math.max(...data, 10);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / (data.length-1)) * w;
    const y = h - (v / max) * h * 0.9;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color + '55');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fill();
}

function spawnPackets() {
  const total = 6;
  const modernShare = slider.value / 100;
  for (let i = 0; i < total; i++) {
    const toModern = Math.random() < modernShare;
    packets.push({
      x: 0,
      y: 60,
      targetY: toModern ? 20 : 100,
      color: toModern ? '#6ee7b7' : '#f5a5a5',
      speed: 1.5 + Math.random() * 1
    });
  }
}

function drawFlow() {
  const w = flowCanvas.width, h = flowCanvas.height;
  fCtx.clearRect(0, 0, w, h);
  fCtx.fillStyle = '#6ee7b7'; fCtx.fillRect(w-80, 10, 70, 20);
  fCtx.fillStyle = '#f5a5a5'; fCtx.fillRect(w-80, 90, 70, 20);
  fCtx.fillStyle = '#0f1117';
  fCtx.font = '11px sans-serif';
  fCtx.fillText('Modern', w-68, 24);
  fCtx.fillText('Legacy', w-68, 104);
  fCtx.fillStyle = '#2a2e3d'; fCtx.fillRect(10, 50, 70, 20);
  fCtx.fillStyle = '#e4e6ea'; fCtx.fillText('Proxy', 28, 64);

  packets = packets.filter(p => p.x < w);
  packets.forEach(p => {
    p.x += p.speed;
    if (p.x > 80) p.y += (p.targetY - p.y) * 0.08;
    fCtx.fillStyle = p.color;
    fCtx.beginPath();
    fCtx.arc(p.x, p.y, 3, 0, Math.PI*2);
    fCtx.fill();
  });
}

function tick() {
  const modernShare = slider.value / 100;
  const totalRps = 80 + Math.random() * 20;
  const mRps = Math.round(totalRps * modernShare);
  const lRps = Math.round(totalRps * (1 - modernShare));
  legacyHistory.push(lRps); modernHistory.push(mRps);
  if (legacyHistory.length > 60) legacyHistory.shift();
  if (modernHistory.length > 60) modernHistory.shift();

  document.getElementById('l-rps').textContent = lRps;
  document.getElementById('m-rps').textContent = mRps;
  document.getElementById('l-lat').textContent = 120 + Math.round(Math.random() * 40);
  document.getElementById('m-lat').textContent = 35 + Math.round(Math.random() * 15);
  document.getElementById('l-err').textContent = (1.5 + Math.random()).toFixed(1);
  document.getElementById('m-err').textContent = (0.2 + Math.random() * 0.3).toFixed(1);

  drawChart(lCtx, legacyHistory, '#f5a5a5');
  drawChart(mCtx, modernHistory, '#6ee7b7');
  spawnPackets();
}

function animate() {
  drawFlow();
  requestAnimationFrame(animate);
}

setInterval(tick, 800);
animate();
tick();