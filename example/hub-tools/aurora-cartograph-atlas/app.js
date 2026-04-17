const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const currents = [
  { name: 'Murmuring Tide',  color: '#6ee7b7', freq: 0.005, amp: 24, phase: 0.0, depth: 0.32 },
  { name: 'Velvet Drift',    color: '#a78bfa', freq: 0.008, amp: 18, phase: 1.2, depth: 0.46 },
  { name: 'Ember Spiral',    color: '#fbbf24', freq: 0.004, amp: 32, phase: 2.7, depth: 0.58 },
  { name: 'Pearl Meander',   color: '#60a5fa', freq: 0.012, amp: 14, phase: 4.1, depth: 0.70 },
  { name: 'Silver Wake',     color: '#f472b6', freq: 0.007, amp: 22, phase: 5.5, depth: 0.82 },
];

const stars = Array.from({ length: 90 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H * 0.38,
  r: 0.4 + Math.random() * 1.4,
  phase: Math.random() * Math.PI * 2,
  hum: 0.0015 + Math.random() * 0.004,
}));

let t = 0, paused = false;
let driftFactor = 0.32;
let auroraIntensity = 0.62;
let cursorX = -1, cursorY = -1;

function drawAurora(now) {
  for (let i = 0; i < 6; i++) {
    const yBase = 38 + i * 20;
    const hue = 148 + i * 16;
    const sway = Math.sin(now * 0.0005 + i) * 22 * auroraIntensity;
    const flick = 0.45 + 0.55 * Math.sin(now * 0.003 + i * 1.4);
    const alpha = (0.055 + 0.11 * auroraIntensity) * flick;
    const g = ctx.createLinearGradient(0, yBase - 32, 0, yBase + 32);
    g.addColorStop(0, `hsla(${hue},70%,60%,0)`);
    g.addColorStop(0.5, `hsla(${hue},82%,66%,${alpha})`);
    g.addColorStop(1, `hsla(${hue},70%,60%,0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, yBase + sway);
    for (let x = 0; x <= W; x += 10) {
      const y = yBase + sway + Math.sin(x * 0.01 + now * 0.0008 + i) * 12 * auroraIntensity;
      ctx.lineTo(x, y);
    }
    for (let x = W; x >= 0; x -= 10) {
      const y = yBase + 52 + sway + Math.sin(x * 0.01 + now * 0.0008 + i) * 12 * auroraIntensity;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
}

function drawStars(now) {
  for (const s of stars) {
    const hum = 0.4 + 0.6 * (Math.sin(now * s.hum + s.phase) * 0.5 + 0.5);
    ctx.globalAlpha = hum * 0.85;
    ctx.fillStyle = '#e7efff';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = hum * 0.14;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 4.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawDunes() {
  ctx.fillStyle = '#242338';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) {
    const y = H - 46 - Math.sin(x * 0.01) * 18 - Math.sin(x * 0.003) * 32;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2f2e45';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) {
    const y = H - 18 - Math.sin(x * 0.018 + 1.2) * 12;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

function currentYAt(c, x, now) {
  const yMin = H * 0.30, yMax = H * 0.82;
  const yCenter = yMin + (yMax - yMin) * c.depth;
  const wobble = Math.sin(x * c.freq + now * 0.001 * (1 + driftFactor * 2.4) + c.phase) * c.amp;
  return yCenter + wobble;
}

function drawCurrents(now) {
  const trail = 220;
  for (const c of currents) {
    ctx.strokeStyle = c.color + '33';
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i = 0; i <= trail; i++) {
      const x = (i / trail) * W;
      const y = currentYAt(c, x, now);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = c.color + 'cc';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

function drawCursor(now) {
  if (cursorX < 0) return;
  ctx.strokeStyle = 'rgba(230,234,242,0.18)';
  ctx.setLineDash([4, 5]);
  ctx.beginPath(); ctx.moveTo(cursorX, 0); ctx.lineTo(cursorX, H); ctx.stroke();
  ctx.setLineDash([]);
  let nearest = null, minDy = Infinity;
  for (const c of currents) {
    const y = currentYAt(c, cursorX, now);
    const dy = Math.abs(y - cursorY);
    if (dy < minDy) { minDy = dy; nearest = { c, y }; }
  }
  if (nearest) {
    ctx.fillStyle = nearest.c.color;
    ctx.beginPath(); ctx.arc(cursorX, nearest.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(15,17,23,0.8)';
    ctx.fillRect(cursorX + 12, nearest.y - 20, 134, 26);
    ctx.strokeStyle = nearest.c.color;
    ctx.strokeRect(cursorX + 12, nearest.y - 20, 134, 26);
    ctx.fillStyle = '#e6eaf2';
    ctx.font = '12px sans-serif';
    ctx.fillText(nearest.c.name, cursorX + 20, nearest.y - 3);
    document.getElementById('nearest').textContent = nearest.c.name;
    document.getElementById('depth').textContent = (nearest.c.depth * 100).toFixed(0) + '%';
  }
}

function frame(now) {
  if (!paused) t = now;
  ctx.clearRect(0, 0, W, H);
  drawStars(t);
  drawAurora(t);
  drawCurrents(t);
  drawDunes();
  drawCursor(t);
  requestAnimationFrame(frame);
}

const legend = document.getElementById('currents');
for (const c of currents) {
  const li = document.createElement('li');
  li.innerHTML = `<span class="swatch" style="background:${c.color};color:${c.color}"></span>${c.name}`;
  legend.appendChild(li);
}

canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  cursorX = (e.clientX - r.left) * (W / r.width);
  cursorY = (e.clientY - r.top) * (H / r.height);
  document.getElementById('cursor').textContent = `${cursorX.toFixed(0)}, ${cursorY.toFixed(0)}`;
});
canvas.addEventListener('mouseleave', () => {
  cursorX = cursorY = -1;
  document.getElementById('cursor').textContent = '—';
  document.getElementById('nearest').textContent = '—';
  document.getElementById('depth').textContent = '—';
});
document.getElementById('drift').addEventListener('input', e => { driftFactor = e.target.value / 100; });
document.getElementById('aurora').addEventListener('input', e => { auroraIntensity = e.target.value / 100; });
document.getElementById('pause').addEventListener('click', e => {
  paused = !paused;
  e.target.textContent = paused ? 'Resume' : 'Pause';
});
document.addEventListener('keydown', e => {
  if (e.key === ' ') { document.getElementById('pause').click(); e.preventDefault(); }
});

requestAnimationFrame(frame);