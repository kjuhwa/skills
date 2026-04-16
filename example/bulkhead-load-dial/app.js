const $ = id => document.getElementById(id);
const chart = $('chart');
const W = 600, H = 280;
const MAX_POINTS = 120;
const history = [];

function compute() {
  const size = +$('size').value;
  const load = +$('load').value;
  const svc = +$('svc').value;
  $('size-v').textContent = size;
  $('load-v').textContent = load;
  $('svc-v').textContent = svc;

  const serviceRate = 1000 / svc;
  const capacity = size * serviceRate;
  const throughput = Math.min(load, capacity);
  const rejected = Math.max(0, load - capacity);
  const util = Math.min(100, (throughput / capacity) * 100);
  const queueDelay = util >= 99 ? svc * 2 : svc / (1 - util / 100 + 0.01) - svc;
  const latency = Math.round(svc + Math.max(0, queueDelay));

  $('k-thru').textContent = throughput.toFixed(1);
  $('k-reject').textContent = rejected.toFixed(1);
  $('k-util').textContent = util.toFixed(0);
  $('k-lat').textContent = latency;

  return { throughput, rejected, util, load };
}

function render() {
  const m = compute();
  history.push(m);
  if (history.length > MAX_POINTS) history.shift();

  const maxLoad = Math.max(80, ...history.map(h => h.load));
  const xStep = W / (MAX_POINTS - 1);

  const pathFor = (key, max) => {
    return history.map((h, i) => {
      const x = i * xStep;
      const y = H - (h[key] / max) * (H - 20) - 10;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  chart.innerHTML = `
    <defs>
      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6ee7b7" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#6ee7b7" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${[0, 0.25, 0.5, 0.75, 1].map(f => {
      const y = H - f * (H - 20) - 10;
      return `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#2a2f3d" stroke-dasharray="2 3"/>`;
    }).join('')}
    <path d="${pathFor('throughput', maxLoad)} L ${W},${H} L 0,${H} Z" fill="url(#g1)" />
    <path d="${pathFor('throughput', maxLoad)}" fill="none" stroke="#6ee7b7" stroke-width="2"/>
    <path d="${pathFor('rejected', maxLoad)}" fill="none" stroke="#ef4444" stroke-width="2"/>
    <path d="${pathFor('util', 100)}" fill="none" stroke="#60a5fa" stroke-width="1.5" stroke-dasharray="4 3"/>
  `;
}

['size', 'load', 'svc'].forEach(id => $(id).addEventListener('input', render));
setInterval(render, 200);
render();