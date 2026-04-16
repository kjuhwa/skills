const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const logEl = document.getElementById('log');
const rateEl = document.getElementById('rate');

const state = { mtls: true, chaos: false, inflight: 0, proxied: 0, blocked: 0, latencies: [] };
const services = [
  { id: 'A', name: 'cart', x: 120, y: 120 },
  { id: 'B', name: 'payment', x: 120, y: 300 },
  { id: 'C', name: 'orders', x: 760, y: 120 },
  { id: 'D', name: 'inventory', x: 760, y: 300 },
];
const packets = [];

function proxyFor(svc) { return { x: svc.x + (svc.x < 400 ? 90 : -90), y: svc.y }; }

function drawService(s) {
  ctx.fillStyle = '#1a1d27';
  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(s.x - 50, s.y - 28, 100, 56, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e5e7eb';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(s.name, s.x, s.y + 4);

  const p = proxyFor(s);
  ctx.fillStyle = state.mtls ? '#6ee7b7' : '#6b7280';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f1117';
  ctx.font = '10px monospace';
  ctx.fillText('SC', p.x, p.y + 3);

  ctx.strokeStyle = '#2a2f3d';
  ctx.beginPath();
  ctx.moveTo(s.x + (s.x < 400 ? 50 : -50), s.y);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  services.forEach(drawService);

  packets.forEach(p => {
    const t = p.progress;
    const x = p.from.x + (p.to.x - p.from.x) * t;
    const y = p.from.y + (p.to.y - p.from.y) * t;
    ctx.fillStyle = p.blocked ? '#ff6b6b' : (state.mtls ? '#6ee7b7' : '#fbbf24');
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    if (state.mtls && !p.blocked) {
      ctx.strokeStyle = 'rgba(110,231,183,0.3)';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function log(msg, cls) {
  const e = document.createElement('div');
  e.className = 'entry ' + (cls || '');
  e.textContent = new Date().toISOString().slice(11, 19) + ' ' + msg;
  logEl.prepend(e);
  while (logEl.children.length > 30) logEl.lastChild.remove();
}

function injectRequest() {
  const from = services[Math.floor(Math.random() * services.length)];
  let to = services[Math.floor(Math.random() * services.length)];
  while (to === from) to = services[Math.floor(Math.random() * services.length)];
  const pFrom = proxyFor(from);
  const pTo = proxyFor(to);
  const blocked = state.chaos && Math.random() < 0.25;

  const legs = [
    { from: from, to: pFrom, blocked: false },
    { from: pFrom, to: pTo, blocked: blocked },
    { from: pTo, to: to, blocked: false },
  ];

  state.inflight++;
  updateStats();
  const start = performance.now();
  runLegs(legs, 0, blocked, start, from.name, to.name);
}

function runLegs(legs, i, blocked, start, fromName, toName) {
  if (i >= legs.length) {
    state.inflight--;
    const dt = performance.now() - start;
    state.latencies.push(dt);
    if (state.latencies.length > 50) state.latencies.shift();
    if (blocked) {
      state.blocked++;
      log(`${fromName}→${toName} BLOCKED by policy`, 'err');
    } else {
      state.proxied++;
      log(`${fromName}→${toName} ${dt.toFixed(0)}ms`, 'ok');
    }
    updateStats();
    return;
  }
  const leg = legs[i];
  if (leg.blocked) {
    const pkt = { ...leg, progress: 0, blocked: true };
    packets.push(pkt);
    animatePkt(pkt, 0.5, () => {
      packets.splice(packets.indexOf(pkt), 1);
      runLegs(legs, legs.length, blocked, start, fromName, toName);
    });
    return;
  }
  const pkt = { ...leg, progress: 0, blocked: false };
  packets.push(pkt);
  animatePkt(pkt, 1, () => {
    packets.splice(packets.indexOf(pkt), 1);
    runLegs(legs, i + 1, blocked, start, fromName, toName);
  });
}

function animatePkt(pkt, target, done) {
  const duration = 400 + Math.random() * 200;
  const t0 = performance.now();
  function step() {
    const t = Math.min(1, (performance.now() - t0) / duration);
    pkt.progress = t * target;
    if (t < 1) requestAnimationFrame(step);
    else done();
  }
  step();
}

function updateStats() {
  document.getElementById('inflight').textContent = state.inflight;
  document.getElementById('proxied').textContent = state.proxied;
  document.getElementById('blocked').textContent = state.blocked;
  const sorted = [...state.latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length / 2)] || 0;
  document.getElementById('p50').textContent = p50.toFixed(0);
}

document.getElementById('injectBtn').onclick = injectRequest;
document.getElementById('toggleMtls').onclick = () => {
  state.mtls = !state.mtls;
  document.getElementById('mtlsState').textContent = state.mtls ? 'ON' : 'OFF';
};
document.getElementById('chaosBtn').onclick = () => {
  state.chaos = !state.chaos;
  document.getElementById('chaosState').textContent = state.chaos ? 'ON' : 'OFF';
};

let auto;
function restartAuto() {
  clearInterval(auto);
  auto = setInterval(injectRequest, parseInt(rateEl.value));
}
rateEl.oninput = restartAuto;
restartAuto();

(function loop() { draw(); requestAnimationFrame(loop); })();
log('Sidecar proxies initialized', 'ok');