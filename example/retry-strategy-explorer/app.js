const $ = id => document.getElementById(id);
const ctx = $('chart').getContext('2d');
const strategies = {
  fixed: (n, b) => b,
  linear: (n, b) => b * (n + 1),
  exponential: (n, b) => b * Math.pow(2, n),
  jitter: (n, b) => Math.random() * b * Math.pow(2, n),
  decorrelated: (n, b, prev) => Math.min(b * 20, Math.random() * (prev * 3 - b) + b)
};

function simulate() {
  const s = $('strategy').value, base = +$('base').value, max = +$('max').value, fail = +$('fail').value / 100;
  const attempts = []; let prev = base, success = false;
  for (let i = 0; i < max; i++) {
    const delay = i === 0 ? 0 : strategies[s](i - 1, base, prev);
    prev = delay || base;
    const roll = Math.random();
    const ok = roll > fail;
    attempts.push({ n: i + 1, delay: Math.round(delay), ok });
    if (ok) { success = true; break; }
  }
  draw(attempts);
  renderLog(attempts);
  const total = attempts.reduce((a, b) => a + b.delay, 0);
  $('stats').innerHTML = `Attempts: <b>${attempts.length}</b><br>Total wait: <b>${total}ms</b><br>Status: <b style="color:${success ? '#6ee7b7' : '#f87171'}">${success ? 'SUCCESS' : 'GAVE UP'}</b>`;
}

function draw(attempts) {
  const W = ctx.canvas.width, H = ctx.canvas.height, pad = 40;
  ctx.clearRect(0, 0, W, H);
  const maxDelay = Math.max(...attempts.map(a => a.delay), 100);
  ctx.strokeStyle = '#242837'; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad + (H - pad * 2) * i / 5;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    ctx.fillStyle = '#8a8f9c'; ctx.font = '11px Consolas';
    ctx.fillText(Math.round(maxDelay * (1 - i / 5)) + 'ms', 4, y + 4);
  }
  const bw = (W - pad * 2) / attempts.length;
  attempts.forEach((a, i) => {
    const h = (a.delay / maxDelay) * (H - pad * 2);
    const x = pad + i * bw, y = H - pad - h;
    ctx.fillStyle = a.ok ? '#6ee7b7' : '#ef4444';
    ctx.fillRect(x + 4, y, bw - 8, h);
    ctx.fillStyle = '#e4e6eb'; ctx.font = '11px Consolas';
    ctx.fillText('#' + a.n, x + bw / 2 - 10, H - pad + 16);
  });
}

function renderLog(attempts) {
  $('log').innerHTML = attempts.map(a =>
    `<li class="${a.ok ? 'ok' : 'fail'}">Attempt ${a.n} · wait ${a.delay}ms · ${a.ok ? '✓ success' : '✗ failed'}</li>`
  ).join('');
}

$('run').onclick = simulate;
['strategy', 'base', 'max', 'fail'].forEach(id => $(id).addEventListener('input', simulate));
simulate();