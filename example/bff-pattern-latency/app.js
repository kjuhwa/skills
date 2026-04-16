const clientRtt = document.getElementById('clientRtt');
const bffRtt = document.getElementById('bffRtt');
const svcCount = document.getElementById('svcCount');
const cVal = document.getElementById('cVal');
const bVal = document.getElementById('bVal');
const sVal = document.getElementById('sVal');
const runBtn = document.getElementById('run');
const noBffEl = document.getElementById('noBff');
const withBffEl = document.getElementById('withBff');
const savingsEl = document.getElementById('savings');
const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');

function sync() {
  cVal.textContent = clientRtt.value;
  bVal.textContent = bffRtt.value;
  sVal.textContent = svcCount.value;
}
[clientRtt, bffRtt, svcCount].forEach(el => el.addEventListener('input', sync));
sync();

function simulate() {
  const c = +clientRtt.value;
  const b = +bffRtt.value;
  const n = +svcCount.value;
  const jitter = () => (Math.random() * 0.4 + 0.8);

  const noBff = Array.from({length: n}, () => c * jitter()).reduce((a,x) => a+x, 0);
  const bffInner = Math.max(...Array.from({length: n}, () => b * jitter()));
  const withBff = c * jitter() + bffInner;

  noBffEl.textContent = Math.round(noBff) + ' ms';
  withBffEl.textContent = Math.round(withBff) + ' ms';
  const savings = Math.max(0, 100 - (withBff / noBff) * 100);
  savingsEl.textContent = savings.toFixed(1) + '%';

  drawTimeline(noBff, withBff, n, c, b);
}

function drawTimeline(noBff, withBff, n, c, b) {
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const maxTime = Math.max(noBff, withBff) * 1.1;
  const scale = (W - 200) / maxTime;

  ctx.fillStyle = '#6b7280';
  ctx.font = '12px sans-serif';
  ctx.fillText('Direct fan-out (client):', 16, 30);
  ctx.fillText('Via BFF (parallel):', 16, 150);

  let t = 0;
  for (let i = 0; i < n; i++) {
    const d = c * (Math.random() * 0.4 + 0.8);
    const x = 190 + t * scale;
    const w = d * scale;
    ctx.fillStyle = `hsl(${10 + i * 20}, 70%, 60%)`;
    ctx.fillRect(x, 50, w, 20);
    t += d;
  }
  ctx.fillStyle = '#6ee7b7';
  ctx.fillText(Math.round(t) + ' ms', 190 + t * scale + 6, 64);

  const cT = c * 0.9;
  ctx.fillStyle = '#7dd3fc';
  ctx.fillRect(190, 170, cT * scale, 20);
  ctx.fillStyle = '#e5e7eb';
  ctx.font = '10px sans-serif';
  ctx.fillText('client→BFF', 192, 184);

  for (let i = 0; i < n; i++) {
    const d = b * (Math.random() * 0.4 + 0.8);
    ctx.fillStyle = `hsla(${150 + i * 15}, 60%, 55%, 0.9)`;
    ctx.fillRect(190 + cT * scale, 200 + i * 2, d * scale, 2);
  }
  ctx.fillStyle = '#6ee7b7';
  ctx.font = '12px sans-serif';
  ctx.fillText(Math.round(withBff) + ' ms', 190 + withBff * scale + 6, 184);
}

runBtn.onclick = simulate;
simulate();