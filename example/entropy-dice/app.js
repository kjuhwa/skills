const faults = [
  'Network latency (+250ms)', 'Packet loss (3%)', 'CPU saturation',
  'Memory leak', 'Disk fill to 95%', 'Clock skew', 'DNS timeout',
  'TLS handshake failure', 'Connection pool exhaustion', 'GC pause storm'
];
const targets = [
  'API gateway', 'Auth service', 'Primary DB replica', 'Message broker',
  'Cache cluster', 'Payment worker', 'Search index', 'Edge CDN node',
  'Background scheduler', 'Object storage'
];
const blasts = [
  '1 pod', '10% of fleet', 'Single AZ', 'One tenant', 'All canary nodes',
  'Read replicas only', '50% of traffic', 'Specific region'
];
const durations = ['2 min', '5 min', '15 min', '30 min', '1 hour'];
const metrics = [
  'Checkout success rate ≥ 99%',
  'API p99 latency < 800ms',
  'Error budget burn rate < 2x',
  'Queue depth stays below 10k',
  'Login success rate ≥ 99.5%'
];
const aborts = [
  'Error rate exceeds 5% for 60s',
  'p99 latency above 2s sustained',
  'Customer-impacting alert fires',
  'Dependent team pages on-call',
  'Throughput drops below 40% of baseline',
  'Any data-loss signal observed'
];

const history = [];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function setFace(id, value) {
  document.getElementById('f-' + id).textContent = value;
}

function roll() {
  const btn = document.getElementById('roll');
  btn.disabled = true;
  const dice = document.querySelectorAll('.die');
  dice.forEach(d => d.classList.add('rolling'));

  const result = { fault: pick(faults), target: pick(targets), blast: pick(blasts), duration: pick(durations), metric: pick(metrics) };

  let frames = 0;
  const spin = setInterval(() => {
    setFace('fault', pick(faults));
    setFace('target', pick(targets));
    setFace('blast', pick(blasts));
    setFace('duration', pick(durations));
    frames++;
    if (frames > 14) {
      clearInterval(spin);
      dice.forEach(d => d.classList.remove('rolling'));
      setFace('fault', result.fault);
      setFace('target', result.target);
      setFace('blast', result.blast);
      setFace('duration', result.duration);
      finalize(result);
      btn.disabled = false;
    }
  }, 70);
}

function finalize(r) {
  document.getElementById('hypothesis').innerHTML =
    `Injecting <strong style="color:#6ee7b7">${r.fault}</strong> against <strong style="color:#6ee7b7">${r.target}</strong> ` +
    `within <strong style="color:#6ee7b7">${r.blast}</strong> for <strong style="color:#6ee7b7">${r.duration}</strong> ` +
    `will NOT degrade the steady-state metric below threshold.`;
  document.getElementById('ssmetric').textContent = r.metric;

  const ul = document.getElementById('aborts');
  ul.innerHTML = '';
  const picked = new Set();
  while (picked.size < 3) picked.add(pick(aborts));
  picked.forEach(a => {
    const li = document.createElement('li');
    li.textContent = a;
    ul.appendChild(li);
  });

  history.unshift(r);
  if (history.length > 6) history.pop();
  const hist = document.getElementById('history');
  hist.innerHTML = history.map(h => `<li>${h.fault} → ${h.target} (${h.blast}, ${h.duration})</li>`).join('');
}

document.getElementById('roll').onclick = roll;
roll();