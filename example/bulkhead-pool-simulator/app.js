const POOLS = {
  payment:  { size: 4, color: '#6ee7b7', avgMs: 800, failRate: 0.1 },
  search:   { size: 6, color: '#60a5fa', avgMs: 400, failRate: 0.05 },
  report:   { size: 3, color: '#f59e0b', avgMs: 1500, failRate: 0.15 }
};
const state = { pools: {}, accepted: 0, rejected: 0, chaos: false, startAt: Date.now() };
const rejectedEl = document.getElementById('rejected');

function buildPools() {
  const root = document.getElementById('pools');
  Object.keys(POOLS).forEach(name => {
    const cfg = POOLS[name];
    state.pools[name] = Array(cfg.size).fill(null);
    const el = document.createElement('div');
    el.className = 'pool';
    el.innerHTML = `<h3>${name.toUpperCase()} <span class="badge">capacity ${cfg.size}</span></h3>
      <div class="slots" id="slots-${name}"></div>
      <div class="pool-queue" id="q-${name}">idle</div>`;
    root.appendChild(el);
    const slots = el.querySelector('.slots');
    for (let i = 0; i < cfg.size; i++) {
      const s = document.createElement('div');
      s.className = 'slot';
      s.innerHTML = '<div class="fill"></div>';
      slots.appendChild(s);
    }
  });
}

function spawn(type) {
  const cfg = POOLS[type];
  const slot = state.pools[type].findIndex(s => s === null);
  if (slot === -1) {
    state.rejected++;
    const item = document.createElement('div');
    item.className = 'queued-item';
    item.textContent = `REJECTED ${type} @ ${new Date().toLocaleTimeString()}`;
    rejectedEl.prepend(item);
    if (rejectedEl.children.length > 20) rejectedEl.lastChild.remove();
    return;
  }
  state.accepted++;
  const duration = cfg.avgMs * (0.6 + Math.random() * 0.8) * (state.chaos && type === 'payment' ? 4 : 1);
  const willFail = Math.random() < (state.chaos ? cfg.failRate * 3 : cfg.failRate);
  const started = Date.now();
  state.pools[type][slot] = { started, duration, willFail };
  const slotEl = document.querySelectorAll(`#slots-${type} .slot`)[slot];
  slotEl.classList.add('busy');
  if (willFail) slotEl.classList.add('failed');
  setTimeout(() => {
    state.pools[type][slot] = null;
    slotEl.classList.remove('busy', 'failed');
    slotEl.querySelector('.fill').style.height = '0%';
  }, duration);
}

function tick() {
  Object.keys(POOLS).forEach(name => {
    const slots = document.querySelectorAll(`#slots-${name} .slot`);
    let active = 0;
    state.pools[name].forEach((job, i) => {
      if (!job) return;
      active++;
      const pct = Math.min(100, ((Date.now() - job.started) / job.duration) * 100);
      slots[i].querySelector('.fill').style.height = pct + '%';
    });
    document.getElementById(`q-${name}`).textContent = `${active}/${POOLS[name].size} in-flight`;
  });
  document.getElementById('accepted').textContent = state.accepted;
  document.getElementById('rejected-count').textContent = state.rejected;
  document.getElementById('uptime').textContent = Math.floor((Date.now() - state.startAt) / 1000) + 's';
}

document.getElementById('spawn-payment').onclick = () => spawn('payment');
document.getElementById('spawn-search').onclick = () => spawn('search');
document.getElementById('spawn-report').onclick = () => spawn('report');
document.getElementById('toggle-chaos').onclick = (e) => {
  state.chaos = !state.chaos;
  e.target.textContent = state.chaos ? 'Chaos: ON' : 'Toggle Chaos Mode';
  e.target.style.background = state.chaos ? '#7f1d1d' : '';
};

buildPools();
setInterval(tick, 100);
setInterval(() => {
  const types = Object.keys(POOLS);
  const n = state.chaos ? 3 : 1;
  for (let i = 0; i < n; i++) spawn(types[Math.floor(Math.random() * types.length)]);
}, 600);