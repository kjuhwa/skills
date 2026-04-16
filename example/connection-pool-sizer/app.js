// Erlang-C queueing approximation for M/M/c pool
function factorial(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }

function erlangC(lambda, mu, c) {
  const a = lambda / mu;
  if (a >= c) return 1; // saturated
  let sum = 0;
  for (let k = 0; k < c; k++) sum += Math.pow(a, k) / factorial(k);
  const top = Math.pow(a, c) / factorial(c) * (c / (c - a));
  return top / (sum + top);
}

function analyze(lam, svc, c) {
  const mu = 1000 / svc; // requests/sec per server
  const rho = lam / (c * mu);
  if (rho >= 1) {
    return { rho, Lq: Infinity, Wq: Infinity, W: Infinity, saturated: true };
  }
  const C = erlangC(lam, mu, c);
  const Wq = C / (c * mu - lam) * 1000; // ms
  const W = Wq + svc;
  const Lq = lam * Wq / 1000;
  return { rho, Lq, Wq, W, saturated: false };
}

const svgNS = 'http://www.w3.org/2000/svg';
function mk(tag, attrs) {
  const el = document.createElementNS(svgNS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function renderChart(lam, svc, c) {
  const svg = document.getElementById('chart');
  svg.innerHTML = '';
  const W = 500, H = 320, pad = 40;
  // axes
  svg.appendChild(mk('line', { x1: pad, y1: H-pad, x2: W-10, y2: H-pad, stroke: '#374151' }));
  svg.appendChild(mk('line', { x1: pad, y1: 20, x2: pad, y2: H-pad, stroke: '#374151' }));

  const maxC = 48;
  const samples = [];
  let maxW = 0;
  for (let k = 1; k <= maxC; k++) {
    const r = analyze(lam, svc, k);
    const w = r.saturated ? 1000 : Math.min(r.W, 1000);
    samples.push({ k, w, rho: Math.min(1, r.rho) });
    if (w > maxW) maxW = w;
  }
  maxW = Math.max(maxW, svc * 2);

  const xOf = k => pad + (k - 1) / (maxC - 1) * (W - pad - 10);
  const yW = w => H - pad - (w / maxW) * (H - pad - 20);
  const yR = r => H - pad - r * (H - pad - 20);

  // wait curve
  let path = '';
  samples.forEach((s, i) => { path += (i ? ' L' : 'M') + xOf(s.k) + ',' + yW(s.w); });
  svg.appendChild(mk('path', { d: path, stroke: '#6ee7b7', 'stroke-width': 2, fill: 'none' }));

  // utilization
  let path2 = '';
  samples.forEach((s, i) => { path2 += (i ? ' L' : 'M') + xOf(s.k) + ',' + yR(s.rho); });
  svg.appendChild(mk('path', { d: path2, stroke: '#fbbf24', 'stroke-width': 2, fill: 'none', 'stroke-dasharray': '4 3' }));

  // marker
  const your = samples.find(s => s.k === c) || samples[samples.length - 1];
  svg.appendChild(mk('line', { x1: xOf(your.k), y1: 20, x2: xOf(your.k), y2: H-pad, stroke: '#f87171', 'stroke-dasharray': '3 3' }));
  svg.appendChild(mk('circle', { cx: xOf(your.k), cy: yW(your.w), r: 5, fill: '#f87171' }));

  // ticks
  for (let k = 4; k <= maxC; k += 8) {
    const t = mk('text', { x: xOf(k), y: H-pad+16, fill: '#6b7280', 'font-size': 10, 'text-anchor': 'middle' });
    t.textContent = k;
    svg.appendChild(t);
  }
  const lbl = mk('text', { x: W/2, y: H-6, fill: '#9ca3af', 'font-size': 11, 'text-anchor': 'middle' });
  lbl.textContent = 'pool size (c)';
  svg.appendChild(lbl);
}

function update() {
  const lam = +document.getElementById('lam').value;
  const svc = +document.getElementById('svc').value;
  const c = +document.getElementById('c').value;
  document.getElementById('lam-v').textContent = lam;
  document.getElementById('svc-v').textContent = svc;
  document.getElementById('c-v').textContent = c;

  const r = analyze(lam, svc, c);
  document.getElementById('r-util').textContent = (r.rho * 100).toFixed(1) + '%';
  document.getElementById('r-lq').textContent = r.saturated ? '∞' : r.Lq.toFixed(2);
  document.getElementById('r-wq').textContent = r.saturated ? '∞' : r.Wq.toFixed(1) + ' ms';
  document.getElementById('r-w').textContent = r.saturated ? '∞' : r.W.toFixed(1) + ' ms';

  const v = document.getElementById('r-verdict');
  v.classList.remove('warn', 'bad');
  if (r.saturated) { v.textContent = 'SATURATED — increase pool'; v.classList.add('bad'); }
  else if (r.rho > 0.85) { v.textContent = 'HIGH — near tipping point'; v.classList.add('warn'); }
  else if (r.rho < 0.3) { v.textContent = 'OVER-PROVISIONED'; v.classList.add('warn'); }
  else v.textContent = 'HEALTHY';

  renderChart(lam, svc, c);
}

['lam', 'svc', 'c'].forEach(id => document.getElementById(id).oninput = update);
update();