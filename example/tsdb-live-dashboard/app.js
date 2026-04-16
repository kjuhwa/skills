const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');
const statsEl = document.getElementById('stats');
const countEl = document.getElementById('count');
const rateEl = document.getElementById('rate');
const metricSel = document.getElementById('metric');
const toggleBtn = document.getElementById('toggleBtn');

let paused = false, points = [], maxPoints = 200, startTime = Date.now();

toggleBtn.onclick = () => { paused = !paused; toggleBtn.textContent = paused ? '▶ Resume' : '⏸ Pause'; };

function genValue(metric) {
  const base = { cpu: 45, mem: 62, disk: 30 }[metric];
  return base + Math.sin(Date.now() / 2000) * 15 + (Math.random() - 0.5) * 20;
}

function updateStats(vals) {
  const min = Math.min(...vals).toFixed(1), max = Math.max(...vals).toFixed(1);
  const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  const cur = vals[vals.length - 1].toFixed(1);
  statsEl.innerHTML = [['Current', cur], ['Average', avg], ['Min', min], ['Max', max]]
    .map(([l, v]) => `<div class="card"><div class="val">${v}</div><div class="lbl">${l}</div></div>`).join('');
}

function draw() {
  const dpr = devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  ctx.clearRect(0, 0, W, H);

  if (points.length < 2) return;
  const vals = points.map(p => p.v);
  const min = Math.min(...vals) - 5, max = Math.max(...vals) + 5;
  const toX = (i) => (i / (maxPoints - 1)) * W;
  const toY = (v) => H - ((v - min) / (max - min)) * (H - 20) - 10;

  // grid
  ctx.strokeStyle = '#2d333b'; ctx.lineWidth = 0.5;
  for (let i = 0; i < 5; i++) { const y = 10 + i * ((H - 20) / 4); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // area
  ctx.beginPath(); ctx.moveTo(toX(0), H);
  points.forEach((p, i) => ctx.lineTo(toX(i), toY(p.v)));
  ctx.lineTo(toX(points.length - 1), H); ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(110,231,183,0.25)'); grad.addColorStop(1, 'rgba(110,231,183,0)');
  ctx.fillStyle = grad; ctx.fill();

  // line
  ctx.beginPath(); points.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p.v)) : ctx.lineTo(toX(i), toY(p.v)));
  ctx.strokeStyle = '#6ee7b7'; ctx.lineWidth = 2; ctx.stroke();

  updateStats(vals);
}

setInterval(() => {
  if (paused) return;
  const v = Math.max(0, Math.min(100, genValue(metricSel.value)));
  points.push({ t: Date.now(), v });
  if (points.length > maxPoints) points.shift();
  countEl.textContent = points.length;
  rateEl.textContent = (points.length / ((Date.now() - startTime) / 1000)).toFixed(1);
  draw();
}, 100);
window.addEventListener('resize', draw);