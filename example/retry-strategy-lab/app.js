const $ = id => document.getElementById(id);
const strategies = {
  fixed: (n, b) => b,
  linear: (n, b) => b * n,
  exponential: (n, b) => b * Math.pow(2, n - 1),
  jitter: (n, b) => Math.random() * b * Math.pow(2, n - 1),
  decorrelated: (n, b, prev) => Math.min(20000, Math.random() * (prev * 3 - b) + b)
};

$('failRate').oninput = e => $('failRateVal').textContent = e.target.value + '%';

function runSim() {
  const strat = $('strategy').value;
  const max = +$('maxRetries').value;
  const base = +$('baseDelay').value;
  const failRate = +$('failRate').value / 100;
  const fn = strategies[strat];
  const attempts = [];
  let prev = base;
  let success = false;
  for (let i = 1; i <= max; i++) {
    const delay = fn(i, base, prev);
    prev = delay;
    const ok = Math.random() > failRate;
    attempts.push({ n: i, delay: Math.round(delay), ok });
    if (ok) { success = true; break; }
  }
  render(attempts, success);
  drawChart(attempts);
}

function render(attempts, success) {
  const log = $('log');
  log.innerHTML = '';
  let total = 0;
  attempts.forEach(a => {
    total += a.delay;
    const li = document.createElement('li');
    li.className = a.ok ? 'success' : 'fail';
    li.textContent = `Attempt ${a.n}: wait ${a.delay}ms → ${a.ok ? 'SUCCESS' : 'FAILED'}`;
    log.appendChild(li);
  });
  $('stats').innerHTML = `Outcome: <b style="color:${success ? '#6ee7b7' : '#f87171'}">${success ? 'RECOVERED' : 'GAVE UP'}</b> • Total wait: ${total}ms • Attempts: ${attempts.length}`;
}

function drawChart(attempts) {
  const c = $('chart');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(0, 0, W, H);
  if (!attempts.length) return;
  const maxDelay = Math.max(...attempts.map(a => a.delay));
  const bw = (W - 80) / attempts.length;
  ctx.strokeStyle = '#2a2f3d';
  for (let y = 0; y < 5; y++) {
    const yp = 30 + (H - 60) * y / 4;
    ctx.beginPath(); ctx.moveTo(40, yp); ctx.lineTo(W - 20, yp); ctx.stroke();
    ctx.fillStyle = '#8b93a7'; ctx.font = '10px monospace';
    ctx.fillText(Math.round(maxDelay * (1 - y / 4)) + 'ms', 4, yp + 3);
  }
  attempts.forEach((a, i) => {
    const h = (a.delay / maxDelay) * (H - 60);
    const x = 40 + i * bw + 4;
    ctx.fillStyle = a.ok ? '#6ee7b7' : '#f87171';
    ctx.fillRect(x, H - 30 - h, bw - 8, h);
    ctx.fillStyle = '#e6e9ef';
    ctx.fillText('#' + a.n, x + bw/2 - 10, H - 12);
  });
}

$('runBtn').onclick = runSim;
runSim();