const cv = document.getElementById('ship');
const ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;
const COMPARTMENTS = 6;
const compW = W / COMPARTMENTS;
const compartments = Array.from({ length: COMPARTMENTS }, (_, i) => ({
  id: i, water: 0, breached: false
}));
const logEl = document.getElementById('log');

function log(msg, cls = '') {
  const li = document.createElement('li');
  li.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  if (cls) li.className = cls;
  logEl.prepend(li);
  if (logEl.children.length > 20) logEl.lastChild.remove();
}

function hullPath() {
  ctx.beginPath();
  ctx.moveTo(30, 80);
  ctx.lineTo(W - 60, 80);
  ctx.quadraticCurveTo(W - 10, 80, W - 30, 260);
  ctx.lineTo(60, 260);
  ctx.quadraticCurveTo(10, 200, 30, 80);
  ctx.closePath();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 260, W, H - 260);
  ctx.fillStyle = 'rgba(96, 165, 250, 0.15)';
  const waveY = 260 + Math.sin(Date.now() / 400) * 3;
  ctx.fillRect(0, waveY, W, H - waveY);

  hullPath();
  ctx.fillStyle = '#1a1d27';
  ctx.fill();
  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  hullPath();
  ctx.clip();
  compartments.forEach((c, i) => {
    const x = 30 + i * ((W - 90) / COMPARTMENTS);
    const w = (W - 90) / COMPARTMENTS;
    const waterH = (c.water / 100) * 180;
    ctx.fillStyle = c.breached ? 'rgba(239, 68, 68, 0.5)' : 'rgba(96, 165, 250, 0.55)';
    ctx.fillRect(x, 260 - waterH, w, waterH);
  });
  ctx.restore();

  for (let i = 1; i < COMPARTMENTS; i++) {
    const x = 30 + i * ((W - 90) / COMPARTMENTS);
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(x, 80);
    ctx.lineTo(x, 260);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  compartments.forEach((c, i) => {
    const x = 30 + i * ((W - 90) / COMPARTMENTS) + ((W - 90) / COMPARTMENTS) / 2;
    ctx.fillStyle = c.breached ? '#ef4444' : '#8a92a8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`C${i + 1}`, x, 100);
    ctx.fillText(Math.round(c.water) + '%', x, 120);
  });
}

function update() {
  let totalWater = 0;
  compartments.forEach(c => {
    if (c.breached && c.water < 100) c.water = Math.min(100, c.water + 0.6);
    totalWater += c.water;
  });
  const integrity = Math.max(0, 100 - totalWater / COMPARTMENTS);
  document.getElementById('integrity-fill').style.width = integrity + '%';
  document.getElementById('integrity-text').textContent = Math.round(integrity) + '%';
  draw();
}

cv.addEventListener('click', e => {
  const rect = cv.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const idx = Math.floor((x - 30) / ((W - 90) / COMPARTMENTS));
  if (idx >= 0 && idx < COMPARTMENTS && !compartments[idx].breached) {
    compartments[idx].breached = true;
    log(`Breach in compartment C${idx + 1}`, 'crit');
  }
});

document.getElementById('repair').onclick = () => {
  compartments.forEach(c => { c.breached = false; c.water = 0; });
  log('All compartments pumped. Hull restored.', 'ok');
};

setInterval(update, 50);
setTimeout(() => log('SS Resilience departs port.', 'ok'), 100);