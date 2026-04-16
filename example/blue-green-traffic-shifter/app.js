const slider = document.getElementById('slider');
const bluePct = document.getElementById('bluePct');
const greenPct = document.getElementById('greenPct');
const blueRps = document.getElementById('blueRps');
const greenRps = document.getElementById('greenRps');
const blueErr = document.getElementById('blueErr');
const greenErr = document.getElementById('greenErr');
const log = document.getElementById('log');
const canvas = document.getElementById('flow');
const ctx = canvas.getContext('2d');

let split = 0, particles = [], lastSplit = -1;
const TOTAL_RPS = 1200;

function addLog(msg) {
  const li = document.createElement('li');
  const t = new Date().toLocaleTimeString();
  li.innerHTML = `<b>[${t}]</b> ${msg}`;
  log.prepend(li);
  while (log.children.length > 30) log.lastChild.remove();
}

function update() {
  split = +slider.value;
  bluePct.textContent = (100 - split) + '%';
  greenPct.textContent = split + '%';
  const bR = Math.round(TOTAL_RPS * (100 - split) / 100);
  const gR = Math.round(TOTAL_RPS * split / 100);
  blueRps.textContent = bR;
  greenRps.textContent = gR;
  blueErr.textContent = Math.round(bR * 0.002);
  greenErr.textContent = Math.round(gR * (split < 20 ? 0.01 : 0.003));
  if (lastSplit !== split) {
    addLog(`Traffic shifted: BLUE <b>${100-split}%</b> → GREEN <b>${split}%</b>`);
    lastSplit = split;
  }
}

slider.addEventListener('input', update);
document.querySelectorAll('.presets button').forEach(b => {
  b.addEventListener('click', () => { slider.value = b.dataset.v; update(); });
});

function spawn() {
  const toGreen = Math.random() * 100 < split;
  particles.push({
    x: 0, y: canvas.height / 2 + (Math.random() - 0.5) * 20,
    vx: 2 + Math.random() * 2,
    target: toGreen ? 'green' : 'blue',
    progress: 0
  });
}

function render() {
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2, cy = canvas.height / 2;

  ctx.strokeStyle = '#252a38'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(cx - 40, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 40, cy - 40); ctx.lineTo(canvas.width, cy - 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 40, cy + 40); ctx.lineTo(canvas.width, cy + 40); ctx.stroke();

  ctx.fillStyle = '#6ee7b7'; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#0f1117'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('LB', cx, cy + 3);

  ctx.fillStyle = '#60a5fa'; ctx.fillRect(canvas.width - 70, cy - 54, 60, 28);
  ctx.fillStyle = '#fff'; ctx.fillText('BLUE', canvas.width - 40, cy - 38);
  ctx.fillStyle = '#6ee7b7'; ctx.fillRect(canvas.width - 70, cy + 26, 60, 28);
  ctx.fillStyle = '#0f1117'; ctx.fillText('GREEN', canvas.width - 40, cy + 44);

  particles.forEach(p => {
    p.x += p.vx;
    if (p.x > cx) {
      const ty = p.target === 'green' ? cy + 40 : cy - 40;
      p.y += (ty - p.y) * 0.08;
    }
    ctx.fillStyle = p.target === 'green' ? '#6ee7b7' : '#60a5fa';
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
  });
  particles = particles.filter(p => p.x < canvas.width);
  requestAnimationFrame(render);
}

setInterval(() => { for (let i = 0; i < 6; i++) spawn(); }, 60);
update();
addLog('System initialized. BLUE is production.');
render();