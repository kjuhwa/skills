const canvas = document.getElementById('chart'), ctx = canvas.getContext('2d');
function resize() { canvas.width = canvas.clientWidth * 2; canvas.height = 400; }
resize(); window.addEventListener('resize', () => { resize(); run(); });

function hash(s, seed) {
  let h = seed;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function run() {
  const m = +document.getElementById('size').value;
  const k = +document.getElementById('hashes').value;
  const steps = 50, probesPerStep = 200;
  const data = [];
  const bits = new Uint8Array(m);
  const added = new Set();

  for (let step = 1; step <= steps; step++) {
    const word = 'word' + step;
    added.add(word);
    for (let j = 0; j < k; j++) bits[hash(word, j + 1) % m] = 1;
    let fp = 0;
    for (let p = 0; p < probesPerStep; p++) {
      const probe = 'probe' + p + '_' + step;
      if (added.has(probe)) continue;
      let match = true;
      for (let j = 0; j < k; j++) if (!bits[hash(probe, j + 1) % m]) { match = false; break; }
      if (match) fp++;
    }
    data.push({ n: step, rate: fp / probesPerStep });
  }
  drawChart(data, m, k);
}

function drawChart(data, m, k) {
  const w = canvas.width, h = canvas.height, pad = 50;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#2d3348'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad + (h - 2 * pad) * (1 - i / 4);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.font = '18px system-ui'; ctx.textAlign = 'right';
    ctx.fillText((i * 25) + '%', pad - 8, y + 5);
  }
  const pw = (w - 2 * pad) / data.length;
  // theoretical line
  ctx.beginPath(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
  data.forEach((d, i) => {
    const theory = Math.pow(1 - Math.exp(-k * d.n / m), k);
    const x = pad + i * pw + pw / 2, y = pad + (h - 2 * pad) * (1 - theory);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke(); ctx.setLineDash([]);
  // actual line
  ctx.beginPath(); ctx.strokeStyle = '#6ee7b7'; ctx.lineWidth = 3;
  data.forEach((d, i) => {
    const x = pad + i * pw + pw / 2, y = pad + (h - 2 * pad) * (1 - d.rate);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  // dots
  data.forEach((d, i) => {
    const x = pad + i * pw + pw / 2, y = pad + (h - 2 * pad) * (1 - d.rate);
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#6ee7b7'; ctx.fill();
  });
  ctx.fillStyle = '#64748b'; ctx.font = '18px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('Items inserted →', w / 2, h - 6);
  const last = data[data.length - 1];
  document.getElementById('result').textContent =
    `After ${data.length} items: FP rate ≈ ${(last.rate * 100).toFixed(1)}% (theory: ${(Math.pow(1 - Math.exp(-k * last.n / m), k) * 100).toFixed(1)}%)`;
}

document.getElementById('run').onclick = run;
document.getElementById('size').onchange = run;
document.getElementById('hashes').onchange = run;
run();