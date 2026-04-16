const errChart = document.getElementById('errChart');
const latChart = document.getElementById('latChart');
const eCtx = errChart.getContext('2d');
const lCtx = latChart.getContext('2d');
const errHist = new Array(80).fill(0.3);
const latHist = new Array(80).fill(120);
let mode = 'calm';
let budget = 1.0;

const dot = document.getElementById('dot');
const modeEl = document.getElementById('mode');

function synthesize() {
  let err, lat;
  switch(mode) {
    case 'latency':
      err = 0.5 + Math.random() * 0.6;
      lat = 480 + Math.random() * 220;
      break;
    case 'errors':
      err = 3.5 + Math.random() * 2.5;
      lat = 180 + Math.random() * 90;
      break;
    case 'partition':
      err = 6 + Math.random() * 4;
      lat = 900 + Math.random() * 400;
      break;
    default:
      err = 0.2 + Math.random() * 0.4;
      lat = 110 + Math.random() * 60;
  }
  errHist.shift(); errHist.push(err);
  latHist.shift(); latHist.push(lat);

  const burn = err > 1 ? err / 1 : 0.05;
  budget = Math.max(0, budget - burn * 0.0008);

  document.getElementById('errVal').textContent = err.toFixed(2) + '%';
  document.getElementById('latVal').textContent = Math.round(lat) + 'ms';
  document.getElementById('budgetPct').textContent = (budget*100).toFixed(1) + '%';
  document.getElementById('burnRate').textContent = burn.toFixed(1) + '×';

  const fill = document.getElementById('budgetFill');
  fill.style.width = (budget*100) + '%';
  if (budget < 0.25) fill.style.background = 'linear-gradient(90deg,#f87171,#fbbf24)';
  else if (budget < 0.6) fill.style.background = 'linear-gradient(90deg,#fbbf24,#6ee7b7)';
  else fill.style.background = 'linear-gradient(90deg,#6ee7b7,#34d399)';

  const daysLeft = burn > 0.1 ? (budget / (burn * 0.0008 * 60 * 24)).toFixed(1) : '∞';
  document.getElementById('timeout').textContent = daysLeft === '∞' ? '∞' : daysLeft + 'd';

  updateStatus(err, lat);
}

function updateStatus(err, lat) {
  dot.className = 'dot';
  if (err > 3 || lat > 700) { dot.classList.add('fail'); modeEl.textContent = 'CRITICAL BURN'; }
  else if (err > 1 || lat > 400) { dot.classList.add('warn'); modeEl.textContent = 'BUDGET THREATENED'; }
  else modeEl.textContent = mode === 'calm' ? 'STEADY STATE' : 'RECOVERING';
}

function drawLine(ctx, data, max, color) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.clearRect(0,0,w,h);
  ctx.strokeStyle = '#22252f'; ctx.lineWidth = 1;
  for (let i=1; i<4; i++) {
    ctx.beginPath(); ctx.moveTo(0, h*i/4); ctx.lineTo(w, h*i/4); ctx.stroke();
  }
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((v,i) => {
    const x = i/(data.length-1)*w;
    const y = h - Math.min(1, v/max)*h;
    i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
  });
  ctx.stroke();
  const grad = ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0, color+'55'); grad.addColorStop(1, color+'00');
  ctx.fillStyle = grad;
  ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath(); ctx.fill();
}

function tick() {
  synthesize();
  drawLine(eCtx, errHist, 10, '#f87171');
  drawLine(lCtx, latHist, 1500, '#6ee7b7');
}

document.querySelectorAll('[data-inject]').forEach(btn => {
  btn.addEventListener('click', () => { mode = btn.dataset.inject; });
});

setInterval(tick, 300);
tick();